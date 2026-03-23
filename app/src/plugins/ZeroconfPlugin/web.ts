import { ZeroconfPlugin, ZeroconfService } from './index';

export class ZeroconfWeb implements ZeroconfPlugin {
  private listeners: { [key: string]: ((service: ZeroconfService) => void)[] } = {};

  async scan(options: { type: string; domain?: string; protocol?: 'tcp' | 'udp' }): Promise<void> {
    console.log('[ZeroconfWeb] Scan not supported on web platform', options);
    // Web 平台不支持 MDNS 扫描
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    console.log('[ZeroconfWeb] Stop scan not supported on web platform');
    return Promise.resolve();
  }

  async addListener(
    eventName: 'serviceFound' | 'serviceLost',
    listenerFunc: (service: ZeroconfService) => void
  ): Promise<{ remove: () => void }> {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listenerFunc);

    return {
      remove: () => {
        this.listeners[eventName] = this.listeners[eventName].filter(l => l !== listenerFunc);
      }
    };
  }
}
