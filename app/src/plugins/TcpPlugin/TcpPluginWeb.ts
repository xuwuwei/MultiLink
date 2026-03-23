import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { TcpPluginDef, MdnsService } from './index';

// Web stub: 仅供浏览器调试，不支持真实 TCP
export class TcpPluginWeb extends WebPlugin implements TcpPluginDef {
  private _connected = new Set<string>();

  async connect(options: { connectionId: string; host: string; port: number }): Promise<{ success: boolean; error?: string }> {
    console.log('[TcpPluginWeb] connect', options.connectionId, options.host, options.port);
    this._connected.add(options.connectionId);
    return { success: true };
  }

  async disconnect(options: { connectionId: string }): Promise<{ success: boolean }> {
    this._connected.delete(options.connectionId);
    return { success: true };
  }

  async send(options: { connectionId: string; data: string }): Promise<{ success: boolean; error?: string }> {
    if (!this._connected.has(options.connectionId)) return { success: false, error: 'Not connected' };
    console.log('[TcpPluginWeb] send (stub):', options.data.trim());
    return { success: true };
  }

  async isConnected(options: { connectionId: string }): Promise<{ connected: boolean }> {
    return { connected: this._connected.has(options.connectionId) };
  }

  async startMdnsDiscovery(_options: { type: string }): Promise<void> {
    console.log('[TcpPluginWeb] startMdnsDiscovery (stub)');
  }

  async stopMdnsDiscovery(): Promise<void> {
    console.log('[TcpPluginWeb] stopMdnsDiscovery (stub)');
  }
}
