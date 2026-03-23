import Foundation

/// 用 NetServiceBrowser 发现局域网 mDNS 服务
class MdnsServiceBrowser: NSObject {
    private let serviceType: String
    private let onServiceFound: ([String: Any]) -> Void
    private var browser: NetServiceBrowser?
    private var pendingServices: [NetService] = []

    init(serviceType: String, onServiceFound: @escaping ([String: Any]) -> Void) {
        self.serviceType = serviceType
        self.onServiceFound = onServiceFound
    }

    func start() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.browser = NetServiceBrowser()
            self.browser?.delegate = self
            self.browser?.searchForServices(ofType: self.serviceType, inDomain: "local.")
            print("[MDNS-iOS] Started browsing for \(self.serviceType) in local.")
        }
    }

    func stop() {
        DispatchQueue.main.async { [weak self] in
            self?.browser?.stop()
            self?.browser = nil
            self?.pendingServices.removeAll()
        }
    }

    private func extractIp(_ addressData: Data, family: Int32) -> String? {
        var addr = (addressData as NSData).bytes.load(as: sockaddr.self)
        var buf = [CChar](repeating: 0, count: Int(NI_MAXHOST))
        if getnameinfo(&addr, socklen_t(addr.sa_len), &buf,
                       socklen_t(buf.count), nil, 0, NI_NUMERICHOST) == 0 {
            return String(cString: buf)
        }
        return nil
    }
}

extension MdnsServiceBrowser: NetServiceBrowserDelegate {
    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        print("[MDNS-iOS] Service found: \(service.name) type=\(service.type)")
        service.delegate = self
        pendingServices.append(service)
        service.resolve(withTimeout: 5.0)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didRemove service: NetService, moreComing: Bool) {
        print("[MDNS-iOS] Service removed: \(service.name)")
        pendingServices.removeAll { $0 == service }
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
        print("[MDNS-iOS] Search failed: \(errorDict)")
    }
}

extension MdnsServiceBrowser: NetServiceDelegate {
    func netServiceDidResolveAddress(_ sender: NetService) {
        var ipv4: [String] = []
        var ipv6: [String] = []

        for data in sender.addresses ?? [] {
            let family = (data as NSData).bytes.load(as: sockaddr.self).sa_family
            if family == sa_family_t(AF_INET), let ip = extractIp(data, family: AF_INET) {
                ipv4.append(ip)
            } else if family == sa_family_t(AF_INET6), let ip = extractIp(data, family: AF_INET6) {
                ipv6.append(ip)
            }
        }

        // 解析 TXT 记录（Rust 服务端在 "name" 字段写入电脑名）
        var txtRecord: [String: String] = [:]
        if let txtData = sender.txtRecordData() {
            let dict = NetService.dictionary(fromTXTRecord: txtData)
            for (key, value) in dict {
                txtRecord[key] = String(data: value, encoding: .utf8) ?? ""
            }
        }

        let service: [String: Any] = [
            "name": sender.name,
            "hostname": sender.hostName ?? "",
            "port": sender.port,
            "ipv4Addresses": ipv4,
            "ipv6Addresses": ipv6,
            "txtRecord": txtRecord
        ]
        onServiceFound(service)
    }
}
