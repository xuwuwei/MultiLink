import TcpPlugin, { MdnsService } from '../plugins/TcpPlugin';
import { Device, createDevice } from './deviceService';
import { connectionService } from './connectionService';

const SERVICE_TYPE = '_multilink._tcp.';

interface DiscoveredDevice {
  device: Device;
  lastSeen: number;
}

// Re-trigger native mDNS scan every 10s so new services are found even if
// the native scanner stops emitting after the first result (e.g. some Android NsdManager quirks).
const RESCAN_INTERVAL_MS = 10_000;

class MdnsDiscoveryService {
  private isScanning = false;
  private discoveredDevices = new Map<string, DiscoveredDevice>();
  private listeners: ((devices: Device[]) => void)[] = [];
  private serviceListener: { remove: () => void } | null = null;
  private autoConnectEnabled = true;
  private rescanTimer: ReturnType<typeof setInterval> | null = null;

  async startDiscovery(autoConnect: boolean = true): Promise<void> {
    if (this.isScanning) {
      console.log('[MDNS] Discovery already running');
      return;
    }

    this.autoConnectEnabled = autoConnect;
    this.isScanning = true;

    try {
      // TcpPlugin 已经正常工作，mDNS 方法复用同一个插件
      this.serviceListener = await TcpPlugin.addListener('serviceFound', ({ service }) => {
        this.handleServiceFound(service);
      });

      await TcpPlugin.startMdnsDiscovery({ type: SERVICE_TYPE });
      console.log('[MDNS] Discovery started');

      // Periodically re-trigger the native scan to catch services that appear later
      this.rescanTimer = setInterval(async () => {
        if (!this.isScanning) return;
        try {
          await TcpPlugin.startMdnsDiscovery({ type: SERVICE_TYPE });
          console.log('[MDNS] Re-scan triggered');
        } catch (_) {}
      }, RESCAN_INTERVAL_MS);
    } catch (error) {
      console.error('[MDNS] Failed to start discovery:', error);
      this.isScanning = false;
    }
  }

  async stopDiscovery(): Promise<void> {
    if (!this.isScanning) return;
    this.isScanning = false;
    if (this.rescanTimer) { clearInterval(this.rescanTimer); this.rescanTimer = null; }
    this.serviceListener?.remove();
    this.serviceListener = null;
    try { await TcpPlugin.stopMdnsDiscovery(); } catch (_) {}
    console.log('[MDNS] Discovery stopped');
  }

  private handleServiceFound(service: MdnsService): void {
    const ip = [...(service.ipv4Addresses || []), ...(service.ipv6Addresses || [])]
      .find(a => a.includes('.') && !a.startsWith('169.254'))
      ?? [...(service.ipv4Addresses || []), ...(service.ipv6Addresses || [])].find(a => a.includes('.'))
      ?? service.hostname?.replace(/\.$/, '');

    if (!ip || !service.port) {
      console.log('[MDNS] No valid IP or port');
      return;
    }

    const key = `${ip}:${service.port}`;
    if (this.discoveredDevices.has(key)) {
      this.discoveredDevices.get(key)!.lastSeen = Date.now();
      return;
    }

    // 名字来源优先级：TXT record.name → mDNS 实例名（过滤掉 service type 前缀）→ 默认值
    // Android NsdManager bug：有时 serviceName 会返回 service type 的前缀如 "keyboardn"
    const SERVICE_TYPE_PREFIX = 'multilink';
    const rawName = service.txtRecord?.name
      || (service.name && service.name.toLowerCase() !== SERVICE_TYPE_PREFIX ? service.name : '')
      || '';
    // 截断：超过 20 个字符时截断并加省略号
    const deviceName = rawName.length > 20
      ? rawName.slice(0, 19) + '…'
      : rawName || 'KeyboardN';
    console.log('[MDNS] Found:', deviceName, '(raw:', service.name, ')', ip, service.port);
    const device = createDevice(deviceName, ip, service.port.toString());
    this.discoveredDevices.set(key, { device, lastSeen: Date.now() });
    this.notifyListeners();

    if (this.autoConnectEnabled) {
      this.autoConnect(device);
    }
  }

  private async autoConnect(device: Device): Promise<void> {
    // Each device has its own connection — skip only if THIS device is already connected
    if (connectionService.isConnected(device.id)) {
      console.log('[MDNS] Already connected to:', device.ip);
      return;
    }
    console.log('[MDNS] Auto-connecting to:', device.ip, device.port);
    try {
      const port = parseInt(device.port || '8333', 10);
      const result = await connectionService.connect(device.id, device.ip, port);
      if (result.success) {
        console.log('[MDNS] Auto-connected to', device.ip);
      } else {
        console.log('[MDNS] Auto-connect failed:', result.error);
      }
    } catch (error) {
      console.error('[MDNS] Auto-connect error:', error);
    }
  }

  getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values()).map(d => d.device);
  }

  onDevicesDiscovered(callback: (devices: Device[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getDiscoveredDevices());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    const devices = this.getDiscoveredDevices();
    this.listeners.forEach(l => l(devices));
  }
}

export const mdnsDiscoveryService = new MdnsDiscoveryService();
