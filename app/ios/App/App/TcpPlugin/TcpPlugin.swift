import Foundation
import Capacitor

@objc(TcpPlugin)
public class TcpPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TcpPlugin"
    public let jsName = "TcpPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "connect",            returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send",               returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isConnected",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startMdnsDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopMdnsDiscovery",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeListener",     returnType: CAPPluginReturnPromise),
    ]

    // Per-device TCP clients, keyed by connectionId (= device.id from JS).
    // Access only on `clientsQueue`.
    private var tcpClients: [String: TcpClient] = [:]
    private let clientsQueue = DispatchQueue(label: "com.keyboardn.tcpplugin.clients")

    private var mdnsBrowser: MdnsServiceBrowser?

    // ── connect ───────────────────────────────────────────────────────────────

    @objc func connect(_ call: CAPPluginCall) {
        guard let cid  = call.getString("connectionId") else { call.reject("connectionId required"); return }
        guard let host = call.getString("host")         else { call.reject("host required");         return }
        guard let port = call.getInt("port")            else { call.reject("port required");         return }

        clientsQueue.async { [weak self] in
            guard let self = self else { return }

            // Tear down any existing client for this id
            self.tcpClients[cid]?.disconnect()
            self.tcpClients.removeValue(forKey: cid)

            let client = TcpClient(host: host, port: port)
            self.tcpClients[cid] = client

            // Stream events fire on the client's background thread;
            // dispatch notifications back to main for Capacitor.
            client.onDisconnect = { [weak self] in
                DispatchQueue.main.async {
                    self?.clientsQueue.async { self?.tcpClients.removeValue(forKey: cid) }
                    self?.notifyListeners("stateChange",
                                         data: ["connectionId": cid, "connected": false])
                }
            }
            client.onError = { [weak self] error in
                DispatchQueue.main.async {
                    self?.clientsQueue.async { self?.tcpClients.removeValue(forKey: cid) }
                    self?.notifyListeners("stateChange",
                                         data: ["connectionId": cid, "connected": false, "error": error])
                }
            }

            // connect() is fully async — completion fires on a background thread.
            client.connect { [weak self] success in
                DispatchQueue.main.async {
                    if success {
                        self?.notifyListeners("stateChange",
                                             data: ["connectionId": cid, "connected": true])
                        call.resolve(["success": true])
                    } else {
                        self?.clientsQueue.async { self?.tcpClients.removeValue(forKey: cid) }
                        call.resolve(["success": false,
                                      "error": client.lastError ?? "Connection failed"])
                    }
                }
            }
        }
    }

    // ── disconnect ────────────────────────────────────────────────────────────

    @objc func disconnect(_ call: CAPPluginCall) {
        guard let cid = call.getString("connectionId") else { call.reject("connectionId required"); return }
        clientsQueue.async { [weak self] in
            self?.tcpClients[cid]?.disconnect()
            self?.tcpClients.removeValue(forKey: cid)
            call.resolve(["success": true])
        }
    }

    // ── send ──────────────────────────────────────────────────────────────────

    @objc func send(_ call: CAPPluginCall) {
        guard let cid  = call.getString("connectionId") else { call.reject("connectionId required"); return }
        guard let data = call.getString("data")         else { call.reject("data required");         return }

        clientsQueue.async { [weak self] in
            guard let client = self?.tcpClients[cid] else {
                call.resolve(["success": false, "error": "Not connected"])
                return
            }
            let ok = client.send(data: data)
            call.resolve(ok ? ["success": true]
                           : ["success": false, "error": client.lastError ?? "Send failed"])
        }
    }

    // ── isConnected ───────────────────────────────────────────────────────────

    @objc func isConnected(_ call: CAPPluginCall) {
        guard let cid = call.getString("connectionId") else { call.reject("connectionId required"); return }
        clientsQueue.async { [weak self] in
            let connected = self?.tcpClients[cid]?.isConnected ?? false
            call.resolve(["connected": connected])
        }
    }

    // ── mDNS ─────────────────────────────────────────────────────────────────

    @objc func startMdnsDiscovery(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "_multilink._tcp."
        let serviceType = type.hasSuffix(".") ? type : "\(type)."
        DispatchQueue.main.async { [weak self] in
            self?.mdnsBrowser = MdnsServiceBrowser(serviceType: serviceType) { [weak self] service in
                self?.notifyListeners("serviceFound", data: ["service": service])
            }
            self?.mdnsBrowser?.start()
            call.resolve()
        }
    }

    @objc func stopMdnsDiscovery(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.mdnsBrowser?.stop()
            self?.mdnsBrowser = nil
            call.resolve()
        }
    }

    // ── Listener management ───────────────────────────────────────────────────

    @objc public override func removeListener(_ call: CAPPluginCall) {
        // Capacitor base class handles listener bookkeeping internally
        // This method just resolves successfully to prevent DataCloneError
        call.resolve()
    }
}
