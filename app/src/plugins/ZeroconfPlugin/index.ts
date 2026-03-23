import { registerPlugin, Capacitor } from '@capacitor/core';
import { ZeroconfWeb } from './web';

export interface ZeroconfService {
  name: string;
  type: string;
  domain: string;
  hostname?: string;
  port?: number;
  addresses?: string[];
  txt?: Record<string, string>;
}

export interface ZeroconfPlugin {
  scan(options: { type: string; domain?: string; protocol?: 'tcp' | 'udp' }): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: 'serviceFound', listenerFunc: (service: ZeroconfService) => void): Promise<{ remove: () => void }>;
  addListener(eventName: 'serviceLost', listenerFunc: (service: ZeroconfService) => void): Promise<{ remove: () => void }>;
}

// 使用 registerPlugin 注册 ZeroConf 插件
// 原生平台会查找 @objc(ZeroConf) 的类
const ZeroConf = registerPlugin<{
  watch(options: { type: string; domain: string }): Promise<string>;
  unwatch(options: { type: string; domain: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: 'discover', listenerFunc: (result: { action: string; service: any }) => void): Promise<{ remove: () => void }>;
}>('ZeroConf', {
  web: () => import('./web').then(m => new m.ZeroconfWeb() as any),
});

// 创建符合我们接口的插件实现
const Zeroconf: ZeroconfPlugin = {
  async scan(options) {
    const domain = options.domain || 'local.';
    const type = `${options.type}.${domain}`;
    await ZeroConf.watch({ type, domain });
  },

  async stop() {
    await ZeroConf.stop();
  },

  async addListener(eventName, listenerFunc) {
    if (eventName === 'serviceFound') {
      const handle = await ZeroConf.addListener('discover', (result) => {
        if (result.action === 'added' || result.action === 'resolved') {
          const service = result.service;
          listenerFunc({
            name: service.name,
            type: service.type,
            domain: service.domain,
            hostname: service.hostname,
            port: service.port,
            addresses: [...(service.ipv4Addresses || []), ...(service.ipv6Addresses || [])],
            txt: service.txtRecord
          });
        }
      });

      return {
        remove: async () => {
          await handle.remove();
        }
      };
    }

    // serviceLost 事件 - 返回空实现
    return {
      remove: () => Promise.resolve()
    };
  }
};

export default Zeroconf;
