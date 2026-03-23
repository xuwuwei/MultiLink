import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface MdnsService {
  name: string;
  hostname: string;
  port: number;
  ipv4Addresses: string[];
  ipv6Addresses: string[];
  txtRecord?: Record<string, string>;
}

export interface TcpPluginDef {
  // connectionId uniquely identifies a device connection (use device.id)
  connect(options: { connectionId: string; host: string; port: number }): Promise<{ success: boolean; error?: string }>;
  disconnect(options: { connectionId: string }): Promise<{ success: boolean }>;
  send(options: { connectionId: string; data: string }): Promise<{ success: boolean; error?: string }>;
  isConnected(options: { connectionId: string }): Promise<{ connected: boolean }>;
  startMdnsDiscovery(options: { type: string }): Promise<void>;
  stopMdnsDiscovery(): Promise<void>;
  addListener(
    eventName: 'stateChange',
    // connectionId tells App.tsx which device changed state
    listenerFunc: (data: { connectionId: string; connected: boolean; error?: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'serviceFound',
    listenerFunc: (data: { service: MdnsService }) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const TcpPlugin = registerPlugin<TcpPluginDef>('TcpPlugin', {
  web: () => import('./TcpPluginWeb').then(m => new m.TcpPluginWeb()),
});

export default TcpPlugin;
