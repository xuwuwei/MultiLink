import { registerPlugin } from '@capacitor/core';

export interface QrPluginDef {
  /** Opens the native full-screen QR scanner.
   *  Resolves with { value } on success, rejects with 'CANCELLED' or 'PERMISSION_DENIED'. */
  scan(): Promise<{ value: string }>;
}

const QrPlugin = registerPlugin<QrPluginDef>('QrPlugin');

export default QrPlugin;
