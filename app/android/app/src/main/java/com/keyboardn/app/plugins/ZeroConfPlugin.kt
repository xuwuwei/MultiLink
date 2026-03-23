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

@CapacitorPlugin(name = "ZeroConf")
class ZeroConfPlugin : Plugin() {

    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private val resolving = java.util.concurrent.atomic.AtomicBoolean(false)

    @PluginMethod
    fun watch(call: PluginCall) {
        val rawType = call.getString("type") ?: run {
            call.reject("type required")
            return
        }

        // NsdManager 期望格式: "_service._tcp." (去掉 local.)
        val nsdType = rawType
            .replace(Regex("\\.local\\.?$"), ".")
            .let { if (it.endsWith(".")) it else "$it." }

        nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager

        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {}
            override fun onDiscoveryStopped(serviceType: String) {}
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                // 失败静默处理，避免 call 已 resolve 后再 reject
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                resolveService(serviceInfo)
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                val data = JSObject()
                data.put("action", "removed")
                data.put("service", buildServiceObj(serviceInfo, null))
                notifyListeners("discover", data)
            }
        }

        try {
            nsdManager!!.discoverServices(nsdType, NsdManager.PROTOCOL_DNS_SD, discoveryListener!!)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to start: ${e.message}")
        }
    }

    private fun resolveService(serviceInfo: NsdServiceInfo) {
        if (!resolving.compareAndSet(false, true)) return
        try {
            nsdManager?.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                    resolving.set(false)
                }
                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                    resolving.set(false)
                    val ip = serviceInfo.host?.hostAddress ?: return
                    val data = JSObject()
                    data.put("action", "resolved")
                    data.put("service", buildServiceObj(serviceInfo, ip))
                    notifyListeners("discover", data)
                }
            })
        } catch (e: Exception) {
            resolving.set(false)
        }
    }

    private fun buildServiceObj(info: NsdServiceInfo, ip: String?): JSObject {
        val obj = JSObject()
        obj.put("name", info.serviceName ?: "")
        obj.put("type", info.serviceType ?: "")
        obj.put("domain", "local.")
        obj.put("port", info.port)
        obj.put("hostname", info.host?.canonicalHostName ?: "")
        val ipv4 = JSArray()
        val ipv6 = JSArray()
        if (ip != null) {
            if (ip.contains(":")) ipv6.put(ip) else ipv4.put(ip)
        }
        obj.put("ipv4Addresses", ipv4)
        obj.put("ipv6Addresses", ipv6)
        obj.put("txtRecord", JSObject())
        return obj
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        try {
            discoveryListener?.let { nsdManager?.stopServiceDiscovery(it) }
        } catch (_: Exception) {}
        discoveryListener = null
        call.resolve()
    }

    @PluginMethod
    fun getHostname(call: PluginCall) {
        call.resolve(JSObject().apply { put("hostname", "android.local") })
    }

    @PluginMethod
    fun register(call: PluginCall) { call.unimplemented("Not implemented") }

    @PluginMethod
    fun unregister(call: PluginCall) { call.unimplemented("Not implemented") }

    @PluginMethod
    fun unwatch(call: PluginCall) { call.resolve() }
}
