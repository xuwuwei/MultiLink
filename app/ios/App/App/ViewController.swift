import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TcpPlugin())
        bridge?.registerPluginInstance(QrPlugin())
        bridge?.registerPluginInstance(PurchasesPlugin())
        // Take over as WKUIDelegate so we can grant camera access to web content.
        webView?.uiDelegate = self
    }
}

extension ViewController: WKUIDelegate {
    // iOS 15+: grant camera/mic permission so getUserMedia() triggers the OS dialog.
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.prompt)
    }
}
