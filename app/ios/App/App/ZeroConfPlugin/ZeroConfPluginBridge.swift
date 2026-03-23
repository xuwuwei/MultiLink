import Foundation
import Capacitor

// 桥接 capacitor-zeroconf 插件到 SPM 项目
// 因为 capacitor-zeroconf 使用 CocoaPods，我们需要手动导入

@objc(ZeroConfPlugin)
public class ZeroConfPluginBridge: CAPPlugin {
    private let implementation = ZeroConfBridge()

    @objc func getHostname(_ call: CAPPluginCall) {
        let value = implementation.getHostname()
        call.resolve(["hostname": value])
    }

    @objc func register(_ call: CAPPluginCall) {
        call.unimplemented("Not implemented in bridge")
    }

    @objc func unregister(_ call: CAPPluginCall) {
        call.unimplemented("Not implemented in bridge")
    }

    @objc func stop(_ call: CAPPluginCall) {
        implementation.stop()
        call.resolve()
    }

    @objc func watch(_ call: CAPPluginCall) {
        call.keepAlive = true
        let typeParam = call.getString("type")
        let domainParam = call.getString("domain")

        guard let type = typeParam, let domain = domainParam else {
            call.reject("Invalid parameters")
            return
        }

        implementation.watch(type: type, domain: domain) { [weak self] (action, service, error) in
            guard let self = self else { return }
            
            var actionStr = ""
            switch action {
            case .added:
                actionStr = "added"
            case .removed:
                actionStr = "removed"
            case .resolved:
                actionStr = "resolved"
            case .error:
                call.reject(error ?? "Unknown error")
                return
            }
            
            if let service = service {
                call.resolve([
                    "action": actionStr,
                    "service": self.jsonifyService(service)
                ])
            }
        }
    }

    @objc func unwatch(_ call: CAPPluginCall) {
        call.resolve()
    }

    private func jsonifyService(_ netService: NetService) -> [String: Any] {
        var ipv4Addresses: [String] = []
        var ipv6Addresses: [String] = []
        
        if let addresses = netService.addresses {
            for address in addresses {
                if let family = extractFamily(address) {
                    if family == 4 {
                        if let addr = extractAddress(address) {
                            ipv4Addresses.append(addr)
                        }
                    } else if family == 6 {
                        if let addr = extractAddress(address) {
                            ipv6Addresses.append(addr)
                        }
                    }
                }
            }
        }

        var txtRecord: [String: String] = [:]
        if let txtRecordData = netService.txtRecordData() {
            txtRecord = dictionary(fromTXTRecord: txtRecordData)
        }

        return [
            "domain": netService.domain,
            "type": netService.type,
            "name": netService.name,
            "port": netService.port,
            "hostname": netService.hostName ?? "",
            "ipv4Addresses": ipv4Addresses,
            "ipv6Addresses": ipv6Addresses,
            "txtRecord": txtRecord
        ]
    }

    private func extractFamily(_ addressBytes: Data) -> Int? {
        let addr = (addressBytes as NSData).bytes.load(as: sockaddr.self)
        if addr.sa_family == sa_family_t(AF_INET) {
            return 4
        } else if addr.sa_family == sa_family_t(AF_INET6) {
            return 6
        }
        return nil
    }

    private func extractAddress(_ addressBytes: Data) -> String? {
        var addr = (addressBytes as NSData).bytes.load(as: sockaddr.self)
        var hostname = [CChar](reating: 0, count: Int(NI_MAXHOST))
        if getnameinfo(&addr, socklen_t(addr.sa_len), &hostname,
                       socklen_t(hostname.count), nil, socklen_t(0), NI_NUMERICHOST) == 0 {
            return String(cString: hostname)
        }
        return nil
    }

    private func dictionary(fromTXTRecord txtData: Data) -> [String: String] {
        var result = [String: String]()
        var data = txtData

        while !data.isEmpty {
            let recordLength = Int(data.removeFirst())
            guard data.count >= recordLength else { return [:] }
            let recordData = data[..<(data.startIndex + recordLength)]
            data = data.dropFirst(recordLength)

            guard let record = String(bytes: recordData, encoding: .utf8) else { return [:] }
            let keyValue = record.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let key = String(keyValue[0])
            switch keyValue.count {
            case 1:
                result[key] = ""
            case 2:
                result[key] = String(keyValue[1])
            default:
                break
            }
        }

        return result
    }
}

// 简化的 ZeroConf 实现
class ZeroConfBridge: NSObject {
    private var browser: NetServiceBrowser?
    private var services: [NetService] = []
    private var callback: ((ZeroConfAction, NetService?, String?) -> Void)?

    enum ZeroConfAction {
        case added
        case removed
        case resolved
        case error
    }

    func getHostname() -> String {
        return Host.current().localizedName ?? ""
    }

    func stop() {
        browser?.stop()
        browser = nil
        services.removeAll()
    }

    func watch(type: String, domain: String, callback: @escaping (ZeroConfAction, NetService?, String?) -> Void) {
        self.callback = callback
        browser = NetServiceBrowser()
        browser?.delegate = self
        browser?.searchForServices(ofType: type, inDomain: domain)
    }
}

extension ZeroConfBridge: NetServiceBrowserDelegate {
    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        service.delegate = self
        services.append(service)
        callback?(.added, service, nil)
        service.resolve(withTimeout: 5.0)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didRemove service: NetService, moreComing: Bool) {
        if let index = services.firstIndex(where: { $0 == service }) {
            services.remove(at: index)
        }
        callback?(.removed, service, nil)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String : NSNumber]) {
        let error = errorDict.map { "\($0.key): \($0.value)" }.joined(separator: ", ")
        callback?(.error, nil, error)
    }
}

extension ZeroConfBridge: NetServiceDelegate {
    func netServiceDidResolveAddress(_ sender: NetService) {
        callback?(.resolved, sender, nil)
    }

    func netService(_ sender: NetService, didNotResolve errorDict: [String : NSNumber]) {
        let error = errorDict.map { "\($0.key): \($0.value)" }.joined(separator: ", ")
        callback?(.error, nil, error)
    }
}
