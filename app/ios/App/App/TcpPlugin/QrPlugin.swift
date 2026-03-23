import Foundation
import Capacitor
import AVFoundation
import UIKit
import AudioToolbox

// MARK: - Scanner View Controller

final class QrScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onResult: ((String) -> Void)?
    var onCancel:  (() -> Void)?

    private let session      = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let dimLayer     = CAShapeLayer()   // masks out the scan box
    private let cornersLayer = CAShapeLayer()   // green L-brackets
    private var didReturn    = false

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupCamera()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        guard !session.isRunning else { return }
        DispatchQueue.global(qos: .userInteractive).async { self.session.startRunning() }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        session.stopRunning()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
        updateOverlay()
    }

    // MARK: Camera setup

    private func setupCamera() {
        guard
            let device = AVCaptureDevice.default(for: .video),
            let input  = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else { return }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        view.layer.insertSublayer(layer, at: 0)
        previewLayer = layer
    }

    // MARK: UI

    private func setupUI() {
        // Semi-transparent dim overlay (cutout for scan box is drawn in updateOverlay)
        dimLayer.fillColor   = UIColor.black.withAlphaComponent(0.50).cgColor
        dimLayer.fillRule    = .evenOdd
        view.layer.addSublayer(dimLayer)

        // Green corner brackets
        cornersLayer.strokeColor = UIColor(red: 0.078, green: 0.722, blue: 0.600, alpha: 1).cgColor
        cornersLayer.fillColor   = UIColor.clear.cgColor
        cornersLayer.lineWidth   = 3
        cornersLayer.lineCap     = .round
        view.layer.addSublayer(cornersLayer)

        // Close button (top-right)
        let closeBtn = UIButton(type: .system)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        let cfg = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill", withConfiguration: cfg), for: .normal)
        closeBtn.tintColor = UIColor.white.withAlphaComponent(0.90)
        closeBtn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(closeBtn)

        // Title (top-center)
        let title = UILabel()
        title.translatesAutoresizingMaskIntoConstraints = false
        title.text      = "Scan QR Code"
        title.textColor = .white
        title.font      = .systemFont(ofSize: 17, weight: .semibold)
        view.addSubview(title)

        // Hint (bottom-center)
        let hint = UILabel()
        hint.translatesAutoresizingMaskIntoConstraints = false
        hint.text      = "Point at the QR code shown on your PC"
        hint.textColor = UIColor.white.withAlphaComponent(0.65)
        hint.font      = .systemFont(ofSize: 13)
        view.addSubview(hint)

        NSLayoutConstraint.activate([
            closeBtn.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            closeBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            title.centerYAnchor.constraint(equalTo: closeBtn.centerYAnchor),
            title.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hint.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -22),
            hint.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
    }

    // MARK: Overlay layout (called on every layout pass)

    private func scanBoxRect() -> CGRect {
        let side = min(view.bounds.width, view.bounds.height) * 0.62
        return CGRect(
            x: (view.bounds.width  - side) / 2,
            y: (view.bounds.height - side) / 2,
            width: side, height: side
        )
    }

    private func updateOverlay() {
        let box = scanBoxRect()
        CATransaction.begin()
        CATransaction.setDisableActions(true)

        // Dim mask with transparent box cutout
        let dimPath = UIBezierPath(rect: view.bounds)
        dimPath.append(UIBezierPath(roundedRect: box, cornerRadius: 14))
        dimLayer.path  = dimPath.cgPath
        dimLayer.frame = view.bounds

        // Corner L-brackets
        let len: CGFloat = min(box.width * 0.15, 30)
        let bPath = UIBezierPath()
        // Top-left
        bPath.move(to: CGPoint(x: box.minX + len, y: box.minY))
        bPath.addLine(to: CGPoint(x: box.minX, y: box.minY))
        bPath.addLine(to: CGPoint(x: box.minX, y: box.minY + len))
        // Top-right
        bPath.move(to: CGPoint(x: box.maxX - len, y: box.minY))
        bPath.addLine(to: CGPoint(x: box.maxX, y: box.minY))
        bPath.addLine(to: CGPoint(x: box.maxX, y: box.minY + len))
        // Bottom-left
        bPath.move(to: CGPoint(x: box.minX, y: box.maxY - len))
        bPath.addLine(to: CGPoint(x: box.minX, y: box.maxY))
        bPath.addLine(to: CGPoint(x: box.minX + len, y: box.maxY))
        // Bottom-right
        bPath.move(to: CGPoint(x: box.maxX, y: box.maxY - len))
        bPath.addLine(to: CGPoint(x: box.maxX, y: box.maxY))
        bPath.addLine(to: CGPoint(x: box.maxX - len, y: box.maxY))
        cornersLayer.path  = bPath.cgPath
        cornersLayer.frame = view.bounds

        CATransaction.commit()
    }

    // MARK: Actions

    @objc private func cancelTapped() {
        guard !didReturn else { return }
        didReturn = true
        onCancel?()
    }

    // MARK: AVCaptureMetadataOutputObjectsDelegate

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard
            !didReturn,
            let obj  = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
            obj.type == .qr,
            let code = obj.stringValue
        else { return }
        didReturn = true
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        onResult?(code)
    }
}

// MARK: - Capacitor Plugin

@objc(QrPlugin)
public class QrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier    = "QrPlugin"
    public let jsName        = "QrPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
    ]

    private var pendingCall: CAPPluginCall?

    @objc func scan(_ call: CAPPluginCall) {
        call.keepAlive = true
        pendingCall = call

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                self.presentScanner()
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if granted {
                            self.presentScanner()
                        } else {
                            self.pendingCall?.reject("PERMISSION_DENIED", "Camera permission denied")
                            self.pendingCall = nil
                        }
                    }
                }
            default:
                self.pendingCall?.reject("PERMISSION_DENIED", "Camera permission denied. Enable in Settings > Privacy > Camera.")
                self.pendingCall = nil
            }
        }
    }

    private func presentScanner() {
        let vc = QrScanViewController()
        vc.modalPresentationStyle = .fullScreen
        vc.onResult = { [weak self] code in
            DispatchQueue.main.async {
                self?.bridge?.viewController?.dismiss(animated: true) {
                    self?.pendingCall?.resolve(["value": code])
                    self?.pendingCall = nil
                }
            }
        }
        vc.onCancel = { [weak self] in
            DispatchQueue.main.async {
                self?.bridge?.viewController?.dismiss(animated: true) {
                    self?.pendingCall?.reject("CANCELLED", "User cancelled")
                    self?.pendingCall = nil
                }
            }
        }
        bridge?.viewController?.present(vc, animated: true)
    }
}
