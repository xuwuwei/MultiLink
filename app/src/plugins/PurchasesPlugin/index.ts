import { Capacitor, registerPlugin } from '@capacitor/core';

export interface PurchasesPlugin {
  configure(options: { apiKey: string; appUserId?: string }): Promise<void>;
  getCustomerInfo(): Promise<{ customerInfo: any }>;
  getOfferings(): Promise<{ offerings: any }>;
  purchasePackage(options: { identifier: string; offeringIdentifier: string }): Promise<{ customerInfo: any; productIdentifier: string }>;
  restorePurchases(): Promise<{ customerInfo: any }>;
  syncPurchases(): Promise<void>;
  setDebugLogsEnabled(options: { enabled: boolean }): Promise<void>;
}

// Web fallback implementation
const PurchasesWeb = {
  async configure(): Promise<void> {
    console.log('Purchases: Web - configure not available');
  },
  async getCustomerInfo(): Promise<{ customerInfo: any }> {
    return { customerInfo: { entitlements: { active: {}, all: {} } } };
  },
  async getOfferings(): Promise<{ offerings: any }> {
    return { offerings: { current: null, all: {} } };
  },
  async purchasePackage(): Promise<{ customerInfo: any; productIdentifier: string }> {
    throw new Error('Purchases only available on native platforms');
  },
  async restorePurchases(): Promise<{ customerInfo: any }> {
    return { customerInfo: { entitlements: { active: {}, all: {} } } };
  },
  async syncPurchases(): Promise<void> {
    console.log('Purchases: Web - syncPurchases not available');
  },
  async setDebugLogsEnabled(): Promise<void> {
    console.log('Purchases: Web - setDebugLogsEnabled not available');
  },
};

export const Purchases = registerPlugin<PurchasesPlugin>('Purchases', {
  web: () => Promise.resolve(PurchasesWeb as PurchasesPlugin),
});
