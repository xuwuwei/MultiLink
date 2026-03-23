import Foundation
import UIKit
import Capacitor

@objc(BrowserPlugin)
public class BrowserPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BrowserPlugin"
    public let jsName = "Browser"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openUrl", returnType: CAPPluginReturnPromise),
    ]

    @objc func openUrl(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Invalid url")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { _ in
                call.resolve()
            }
        }
    }
}
