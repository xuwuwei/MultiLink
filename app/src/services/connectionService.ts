import TcpPlugin from '../plugins/TcpPlugin';

const h2 = (n: number) => (n & 0xFF).toString(16).padStart(2, '0').toUpperCase();

const RETRY_INTERVAL_MS = 5000;

interface DeviceConn {
  host: string;
  port: number;
  connected: boolean;
  connecting: boolean;
  retryTimer: ReturnType<typeof setInterval> | null;
  isRetrying: boolean;
}

class ConnectionService {
  // Per-device connection state, keyed by device.id (= connectionId in native plugin)
  private conns = new Map<string, DeviceConn>();
  // Which device's connection is currently used for sending
  private activeId = '';
  // Global listeners: called whenever any device's connection state changes
  private listeners: ((deviceId: string, connected: boolean) => void)[] = [];

  constructor() {
    // Single native listener handles stateChange events for ALL connections
    TcpPlugin.addListener('stateChange', ({ connectionId, connected }) => {
      const conn = this.conns.get(connectionId);
      if (!conn) return;

      const wasConnected = conn.connected;
      conn.connected = connected;

      if (!connected && wasConnected) {
        this.notifyListeners(connectionId, false);
        this.startRetry(connectionId);
      } else if (connected && !wasConnected) {
        this.notifyListeners(connectionId, true);
        this.stopRetry(connectionId);
      }
    });
  }

  // ── Retry logic (per-device) ───────────────────────────────────────────────

  private startRetry(deviceId: string) {
    const conn = this.conns.get(deviceId);
    if (!conn || conn.retryTimer || !conn.host) return;
    conn.isRetrying = true;
    conn.retryTimer = setInterval(async () => {
      const c = this.conns.get(deviceId);
      if (!c || c.connected) { this.stopRetry(deviceId); return; }
      console.log('[Connection] Auto-retry', deviceId, c.host, c.port);
      await this._doConnect(deviceId, c.host, c.port, true);
    }, RETRY_INTERVAL_MS);
  }

  private stopRetry(deviceId: string) {
    const conn = this.conns.get(deviceId);
    if (!conn) return;
    if (conn.retryTimer) { clearInterval(conn.retryTimer); conn.retryTimer = null; }
    conn.isRetrying = false;
  }

  private notifyListeners(deviceId: string, connected: boolean) {
    this.listeners.forEach(l => l(deviceId, connected));
  }

  // ── Core connect logic ────────────────────────────────────────────────────

  private async _doConnect(
    deviceId: string, host: string, port: number, isRetry = false
  ): Promise<{ success: boolean; error?: string }> {
    let conn = this.conns.get(deviceId);
    if (!conn) {
      conn = { host, port, connected: false, connecting: false, retryTimer: null, isRetrying: false };
      this.conns.set(deviceId, conn);
    }
    conn.host = host;
    conn.port = port;
    if (!isRetry) this.stopRetry(deviceId);

    if (conn.connecting) return { success: false, error: 'Already connecting' };
    conn.connecting = true;

    const timeout = new Promise<{ success: boolean; error: string }>(resolve =>
      setTimeout(() => resolve({ success: false, error: 'Connection timeout' }), 10000)
    );

    try {
      const result = await Promise.race([
        TcpPlugin.connect({ connectionId: deviceId, host, port }),
        timeout,
      ]);
      conn.connected = result.success;
      conn.connecting = false;
      this.notifyListeners(deviceId, conn.connected);
      return result;
    } catch (error) {
      conn.connected = false;
      conn.connecting = false;
      this.notifyListeners(deviceId, false);
      return { success: false, error: String(error) };
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Connect a device. Existing connections to OTHER devices are kept alive. */
  async connect(deviceId: string, host: string, port: number = 8333): Promise<{ success: boolean; error?: string }> {
    return this._doConnect(deviceId, host, port, false);
  }

  /** Disconnect a specific device and remove its retry timer. */
  async disconnect(deviceId: string): Promise<void> {
    const conn = this.conns.get(deviceId);
    if (!conn) return;
    this.stopRetry(deviceId);
    conn.connected = false;
    conn.host = '';
    await TcpPlugin.disconnect({ connectionId: deviceId });
    this.conns.delete(deviceId);
    this.notifyListeners(deviceId, false);
  }

  /** Disconnect all tracked devices (e.g. on app teardown). */
  async disconnectAll(): Promise<void> {
    const ids = [...this.conns.keys()];
    await Promise.all(ids.map(id => this.disconnect(id)));
  }

  /** Route all sends to this device. */
  setActive(deviceId: string) {
    this.activeId = deviceId;
  }

  getActive(): string { return this.activeId; }

  /** Is a specific device (or the active device if omitted) connected? */
  isConnected(deviceId?: string): boolean {
    const id = deviceId ?? this.activeId;
    if (!id) return false;
    return this.conns.get(id)?.connected ?? false;
  }

  isAutoRetrying(deviceId?: string): boolean {
    const id = deviceId ?? this.activeId;
    if (!id) return false;
    return this.conns.get(id)?.isRetrying ?? false;
  }

  /** Subscribe to connection-state changes for ANY device. */
  onConnectionChange(callback: (deviceId: string, connected: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  // ── Send helpers (always to active device) ────────────────────────────────

  private async send(msg: string): Promise<boolean> {
    if (!this.activeId || !this.isConnected()) return false;
    try {
      const result = await TcpPlugin.send({ connectionId: this.activeId, data: msg + '\n' });
      return result.success ?? false;
    } catch {
      return false;
    }
  }

  sendKeyDown(scanCode: number): Promise<boolean>  { return this.send(`D${h2(scanCode)}`); }
  sendKeyUp(scanCode: number): Promise<boolean>    { return this.send(`U${h2(scanCode)}`); }
  sendMouseMove(x: number, y: number): Promise<boolean> { return this.send(`M${h2(x)}${h2(y)}`); }
  sendMouseButton(button: number, pressed: boolean): Promise<boolean> {
    return this.send(`B${h2(button)}${pressed ? '1' : '0'}`);
  }
  sendMouseScroll(delta: number): Promise<boolean>      { return this.send(`S${h2(delta)}`); }
  sendMouseDoubleClick(button: number): Promise<boolean>{ return this.send(`C${h2(button)}`); }
}

export const connectionService = new ConnectionService();
