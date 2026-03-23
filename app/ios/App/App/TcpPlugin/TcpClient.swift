import Foundation

/// Non-blocking TCP client.
/// Streams are scheduled on a **dedicated background thread** — the main thread
/// is never blocked, so UI, touch events, and sends to other devices all remain
/// responsive even while a connection attempt to a dead server is timing out.
class TcpClient {
    private let host: String
    private let port: Int

    private var inputStream:   InputStream?
    private var outputStream:  OutputStream?
    private var cfRunLoop:     CFRunLoop?
    private var streamDelegate: StreamDelegateHandler?

    private let lock = NSLock()
    private var connectCompletion: ((Bool) -> Void)?
    private var completionFired = false

    var isConnected = false
    var lastError:   String?

    var onData:       ((String) -> Void)?
    var onDisconnect: (() -> Void)?
    var onError:      ((String) -> Void)?

    init(host: String, port: Int) {
        self.host = host
        self.port = port
    }

    deinit { disconnect() }

    // ── Public API ────────────────────────────────────────────────────────────

    /// Asynchronous connect. Calls `completion` on a background thread — the
    /// caller (TcpPlugin) dispatches back to main/Capacitor as needed.
    func connect(timeout: TimeInterval = 5.0, completion: @escaping (Bool) -> Void) {
        connectCompletion = completion
        completionFired   = false

        // Launch a dedicated thread; its RunLoop drives all stream events.
        Thread.detachNewThread { [weak self] in
            guard let self = self else { return }
            self.cfRunLoop = CFRunLoopGetCurrent()
            self.setupStreams()
            CFRunLoopRun()   // blocked here — exits when CFRunLoopStop is called
        }

        // Hard timeout: fire on a global queue so we never touch the main thread.
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + timeout) { [weak self] in
            self?.fireCompletion(false, error: "Connection timeout")
        }
    }

    /// Thread-safe send (may be called from any thread).
    func send(data: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        guard let out = outputStream, isConnected else {
            lastError = "Not connected"
            return false
        }
        guard let bytes = data.data(using: .utf8) else { return false }
        return bytes.withUnsafeBytes { buf -> Bool in
            guard let base = buf.baseAddress else { return false }
            let n = out.write(base.assumingMemoryBound(to: UInt8.self), maxLength: bytes.count)
            if n < 0 { lastError = out.streamError?.localizedDescription ?? "Write error" }
            return n >= 0
        }
    }

    /// Close the connection. Safe to call from any thread.
    func disconnect() {
        lock.lock()
        isConnected = false
        let inp = inputStream
        let out = outputStream
        inputStream   = nil
        outputStream  = nil
        streamDelegate = nil
        let rl = cfRunLoop
        cfRunLoop = nil
        lock.unlock()

        // Stop the background RunLoop so its thread exits cleanly.
        if let rl = rl {
            // Perform stream cleanup on the RunLoop's own thread to avoid
            // "stream scheduled on wrong thread" warnings.
            CFRunLoopPerformBlock(rl, CFRunLoopMode.defaultMode.rawValue) {
                inp?.close()
                out?.close()
                if let r = RunLoop.current as RunLoop? {
                    inp?.remove(from: r, forMode: .default)
                    out?.remove(from: r, forMode: .default)
                }
            }
            CFRunLoopWakeUp(rl)
            CFRunLoopStop(rl)
        } else {
            inp?.close()
            out?.close()
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /// Called on the background network thread.
    private func setupStreams() {
        var readRef:  Unmanaged<CFReadStream>?
        var writeRef: Unmanaged<CFWriteStream>?
        CFStreamCreatePairWithSocketToHost(kCFAllocatorDefault,
                                           host as CFString, UInt32(port),
                                           &readRef, &writeRef)

        guard let rr = readRef, let wr = writeRef else {
            fireCompletion(false, error: "Failed to create streams")
            return
        }

        let inp = rr.takeRetainedValue() as InputStream
        let out = wr.takeRetainedValue() as OutputStream

        let handler = StreamDelegateHandler(client: self)
        self.streamDelegate = handler   // retain strongly so the weak delegate pointer stays valid
        inp.delegate = handler
        out.delegate = handler

        let rl = RunLoop.current
        inp.schedule(in: rl, forMode: .default)
        out.schedule(in: rl, forMode: .default)

        lock.lock()
        inputStream  = inp
        outputStream = out
        lock.unlock()

        inp.open()
        out.open()
    }

    /// Fire the connect completion exactly once, then stop the RunLoop on failure.
    func fireCompletion(_ success: Bool, error: String? = nil) {
        lock.lock()
        guard !completionFired else { lock.unlock(); return }
        completionFired = true
        if !success {
            isConnected = false
            if let e = error { lastError = e }
        }
        let cb = connectCompletion
        connectCompletion = nil
        lock.unlock()

        if !success { stopRunLoop() }
        cb?(success)
    }

    private func stopRunLoop() {
        if let rl = cfRunLoop { CFRunLoopStop(rl) }
    }

    // ── Stream event handler (called on background network thread) ─────────────

    func handleStreamEvent(_ stream: Stream, event: Stream.Event) {
        if stream === outputStream {
            if event.contains(.openCompleted) {
                lock.lock(); isConnected = true; lock.unlock()
                fireCompletion(true)
            }
            if event.contains(.errorOccurred) {
                let msg = (stream as? OutputStream)?.streamError?.localizedDescription ?? "Output error"
                lock.lock(); isConnected = false; lock.unlock()
                fireCompletion(false, error: msg)
                onError?(msg)
            }
        }

        if stream === inputStream {
            if event.contains(.hasBytesAvailable) {
                var buf = [UInt8](repeating: 0, count: 4096)
                let n = (stream as! InputStream).read(&buf, maxLength: buf.count)
                if n > 0, let s = String(bytes: buf[0..<n], encoding: .utf8) {
                    onData?(s)
                } else if n < 0 {
                    let msg = (stream as? InputStream)?.streamError?.localizedDescription ?? "Read error"
                    lastError = msg
                    onError?(msg)
                }
            }
            if event.contains(.endEncountered) {
                lock.lock(); isConnected = false; lock.unlock()
                stopRunLoop()
                onDisconnect?()
            }
            if event.contains(.errorOccurred) {
                let msg = (stream as? InputStream)?.streamError?.localizedDescription ?? "Input error"
                lastError = msg
                lock.lock(); isConnected = false; lock.unlock()
                stopRunLoop()
                onError?(msg)
            }
        }
    }
}

private class StreamDelegateHandler: NSObject, StreamDelegate {
    weak var client: TcpClient?
    init(client: TcpClient) { self.client = client }
    func stream(_ stream: Stream, handle event: Stream.Event) {
        client?.handleStreamEvent(stream, event: event)
    }
}
