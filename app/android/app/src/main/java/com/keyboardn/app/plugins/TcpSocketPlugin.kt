package com.keyboardn.app.plugins

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.io.BufferedWriter
import java.io.OutputStreamWriter
import java.net.Socket
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(name = "TcpPlugin")
class TcpSocketPlugin : Plugin() {

    // ── Multi-connection state ────────────────────────────────────────────────

    private class ConnState(
        @Volatile var socket: Socket? = null,
        @Volatile var writer: BufferedWriter? = null,
        @Volatile var connected: Boolean = false,
    )

    private val connections = ConcurrentHashMap<String, ConnState>()
    private val ioScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // ── connect ───────────────────────────────────────────────────────────────

    @PluginMethod
    fun connect(call: PluginCall) {
        val cid  = call.getString("connectionId") ?: return call.reject("connectionId is required")
        val host = call.getString("host")         ?: return call.reject("host is required")
        val port = call.getInt("port")            ?: return call.reject("port is required")

        // Close any existing connection for this id
        closeConn(cid)

        val state = ConnState()
        connections[cid] = state

        ioScope.launch {
            try {
                val sock = Socket()
                sock.tcpNoDelay = true
                sock.soTimeout  = 0
                sock.connect(InetSocketAddress(host, port), 5000)

                state.socket  = sock
                state.writer  = BufferedWriter(OutputStreamWriter(sock.getOutputStream(), Charsets.UTF_8))
                state.connected = true

                notifyStateChange(cid, true)
                call.resolve(JSObject().apply { put("success", true) })

                monitorConn(cid, sock, state)
            } catch (e: Exception) {
                connections.remove(cid)
                notifyStateChange(cid, false, e.message)
                call.reject("Connection failed: ${e.message}")
            }
        }
    }

    // ── disconnect ────────────────────────────────────────────────────────────

    @PluginMethod
    fun disconnect(call: PluginCall) {
        val cid = call.getString("connectionId") ?: return call.reject("connectionId is required")
        closeConn(cid)
        connections.remove(cid)
        call.resolve()
    }

    // ── send ──────────────────────────────────────────────────────────────────

    @PluginMethod
    fun send(call: PluginCall) {
        val cid  = call.getString("connectionId") ?: return call.reject("connectionId is required")
        val data = call.getString("data")         ?: return call.reject("data is required")

        val state = connections[cid]
        if (state == null || !state.connected) return call.reject("Not connected: $cid")

        ioScope.launch {
            try {
                state.writer?.let { w -> w.write(data); w.newLine(); w.flush() }
                call.resolve()
            } catch (e: Exception) {
                closeConn(cid)
                connections.remove(cid)
                notifyStateChange(cid, false, e.message)
                call.reject("Send failed: ${e.message}")
            }
        }
    }

    // ── isConnected ───────────────────────────────────────────────────────────

    @PluginMethod
    fun isConnected(call: PluginCall) {
        val cid   = call.getString("connectionId") ?: return call.reject("connectionId is required")
        val state = connections[cid]
        val ok    = state != null && state.connected &&
                    state.socket?.isConnected == true && state.socket?.isClosed == false
        call.resolve(JSObject().apply { put("connected", ok) })
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private fun closeConn(cid: String) {
        connections[cid]?.let { st ->
            st.connected = false
            try { st.writer?.close() } catch (_: Exception) {}
            try { st.socket?.close() } catch (_: Exception) {}
            st.writer = null
            st.socket = null
        }
    }

    private fun monitorConn(cid: String, sock: Socket, state: ConnState) {
        ioScope.launch {
            try {
                val buf = ByteArray(64)
                val inp = sock.getInputStream()
                while (true) { if (inp.read(buf) == -1) break }
            } catch (_: Exception) {}
            if (state.connected) {
                closeConn(cid)
                connections.remove(cid)
                notifyStateChange(cid, false, "Connection lost")
            }
        }
    }

    private fun notifyStateChange(cid: String, connected: Boolean, error: String? = null) {
        val data = JSObject()
        data.put("connectionId", cid)
        data.put("connected", connected)
        error?.let { data.put("error", it) }
        notifyListeners("stateChange", data)
    }

    override fun handleOnDestroy() {
        connections.keys.toList().forEach { closeConn(it) }
        connections.clear()
        stopMdnsInternal()
        ioScope.cancel()
        super.handleOnDestroy()
    }

    // ── mDNS ─────────────────────────────────────────────────────────────────

    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private val resolving = AtomicBoolean(false)

    @PluginMethod
    fun startMdnsDiscovery(call: PluginCall) {
        val rawType = call.getString("type") ?: "_multilink._tcp."
        val nsdType = rawType.replace(Regex("\\.local\\.?$"), "").trimEnd('.') + "."

        nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(t: String) {}
            override fun onDiscoveryStopped(t: String) {}
            override fun onStartDiscoveryFailed(t: String, e: Int) {}
            override fun onStopDiscoveryFailed(t: String, e: Int) {}
            override fun onServiceFound(info: NsdServiceInfo) {
                val capturedName = info.serviceName ?: ""
                resolveService(info, capturedName)
            }
            override fun onServiceLost(info: NsdServiceInfo) {}
        }
        try {
            nsdManager!!.discoverServices(nsdType, NsdManager.PROTOCOL_DNS_SD, discoveryListener!!)
            call.resolve()
        } catch (e: Exception) {
            call.reject("mDNS start failed: ${e.message}")
        }
    }

    @PluginMethod
    fun stopMdnsDiscovery(call: PluginCall) {
        stopMdnsInternal()
        call.resolve()
    }

    private fun resolveService(info: NsdServiceInfo, capturedName: String) {
        if (!resolving.compareAndSet(false, true)) return
        try {
            nsdManager?.resolveService(info, object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo, code: Int) { resolving.set(false) }
                override fun onServiceResolved(info: NsdServiceInfo) {
                    resolving.set(false)
                    val ip = info.host?.hostAddress ?: return
                    val ipv4 = JSArray(); val ipv6 = JSArray()
                    if (ip.contains(":")) ipv6.put(ip) else ipv4.put(ip)

                    val txtName = try {
                        info.attributes?.get("name")?.let { String(it, Charsets.UTF_8) }
                    } catch (_: Exception) { null }

                    val rawName = txtName?.takeIf { it.isNotBlank() }
                        ?: capturedName.takeIf { it.isNotBlank() }
                        ?: ""

                    val svc = JSObject().apply {
                        put("name", rawName)
                        put("hostname", info.host?.hostAddress ?: "")
                        put("port", info.port)
                        put("ipv4Addresses", ipv4)
                        put("ipv6Addresses", ipv6)
                    }
                    notifyListeners("serviceFound", JSObject().apply { put("service", svc) })
                }
            })
        } catch (e: Exception) { resolving.set(false) }
    }

    private fun stopMdnsInternal() {
        try { discoveryListener?.let { nsdManager?.stopServiceDiscovery(it) } } catch (_: Exception) {}
        discoveryListener = null
    }

    // ── Listener management ───────────────────────────────────────────────────

    @PluginMethod
    fun removeListener(call: PluginCall) {
        // Capacitor base Plugin handles listener bookkeeping internally
        // This method just resolves successfully to prevent DataCloneError
        call.resolve()
    }
}
