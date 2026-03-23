import { Capacitor } from '@capacitor/core';
import { Purchases } from '../plugins/PurchasesPlugin';
import { StorageService } from './platformService';

// RevenueCat configuration
// Public SDK Keys - these are safe to use in client-side code
const REVENUECAT_API_KEY_IOS = 'test_hzlpOXHVkGRNoCqMJCodIcYwURI';
const REVENUECAT_API_KEY_ANDROID = 'test_hzlpOXHVkGRNoCqMJCodIcYwURI';

// Product identifiers
const ENTITLEMENT_PRO = 'pro';

export interface PurchaseInfo {
  isPro: boolean;
  purchaseDate?: string;
  expiryDate?: string;
}

class PurchaseService {
  private initialized = false;
  private purchaseListeners: ((isPro: boolean) => void)[] = [];

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) {
      console.log('RevenueCat: Purchases only available on native platforms');
      return;
    }

    try {
      const apiKey = Capacitor.getPlatform() === 'ios'
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

      await Purchases.setDebugLogsEnabled({ enabled: true });
      await Purchases.configure({ apiKey });

      // Check initial status
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isPro = this.checkProEntitlement(customerInfo);
      if (isPro) {
        this.notifyListeners(true);
      }

      this.initialized = true;
      console.log('RevenueCat: Initialized successfully');
    } catch (error) {
      console.error('RevenueCat: Initialization error:', error);
      const stored = this.getStoredPurchaseInfo();
      if (stored?.isPro) {
        this.notifyListeners(true);
      }
    }
  }

  private checkProEntitlement(customerInfo: any): boolean {
    if (!customerInfo?.entitlements?.active) return false;
    return ENTITLEMENT_PRO in customerInfo.entitlements.active;
  }

  private savePurchaseStatus(isPro: boolean): void {
    const purchaseInfo: PurchaseInfo = {
      isPro,
      purchaseDate: new Date().toISOString(),
    };
    StorageService.setItem('purchase_info', JSON.stringify(purchaseInfo));
  }

  getStoredPurchaseInfo(): PurchaseInfo | null {
    const stored = StorageService.getItem('purchase_info');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  async isPro(): Promise<boolean> {
    if (this.initialized && Capacitor.isNativePlatform()) {
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        return this.checkProEntitlement(customerInfo);
      } catch (error) {
        console.error('RevenueCat: Error checking status:', error);
      }
    }

    const stored = this.getStoredPurchaseInfo();
    return stored?.isPro ?? false;
  }

  async purchasePro(): Promise<{ success: boolean; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Purchases only available on mobile apps' };
    }

    try {
      const { offerings } = await Purchases.getOfferings();

      if (!offerings?.current) {
        return { success: false, error: 'No products available. Please try again later.' };
      }

      const packages = offerings.current.availablePackages;
      if (!packages || packages.length === 0) {
        return { success: false, error: 'Pro package not found. Please try again later.' };
      }

      const pkg = packages[0];
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage({
        identifier: pkg.identifier,
        offeringIdentifier: pkg.offeringIdentifier,
      });

      console.log('RevenueCat: Purchase successful for product:', productIdentifier);

      const isPro = this.checkProEntitlement(customerInfo);
      if (isPro) {
        this.savePurchaseStatus(true);
        this.notifyListeners(true);
        return { success: true };
      } else {
        return { success: false, error: 'Purchase completed but Pro not unlocked. Please contact support.' };
      }
    } catch (error: any) {
      console.error('RevenueCat: Purchase error:', error);

      const errorCode = error.code || error.message;
      if (errorCode === 'PURCHASE_CANCELLED' || errorCode === 'USER_CANCELLED') {
        return { success: false, error: 'Purchase cancelled' };
      }
      if (errorCode === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE') {
        return { success: false, error: 'Product not available' };
      }
      if (errorCode === 'RECEIPT_ALREADY_IN_USE') {
        return { success: false, error: 'Receipt already in use. Please restore purchases.' };
      }
      if (errorCode === 'PAYMENT_PENDING') {
        return { success: false, error: 'Payment pending. Please complete the payment process.' };
      }
      if (errorCode === 'STORE_PROBLEM') {
        return { success: false, error: 'Store problem. Please try again later.' };
      }
      if (errorCode === 'PURCHASE_NOT_ALLOWED') {
        return { success: false, error: 'Purchases not allowed on this device.' };
      }

      return { success: false, error: error?.message || 'Purchase failed. Please try again.' };
    }
  }

  async restorePurchases(): Promise<{ success: boolean; isPro: boolean; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, isPro: false, error: 'Purchases only available on mobile apps' };
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = this.checkProEntitlement(customerInfo);

      if (isPro) {
        this.savePurchaseStatus(true);
        this.notifyListeners(true);
      }

      return { success: true, isPro };
    } catch (error: any) {
      console.error('RevenueCat: Restore error:', error);
      return { success: false, isPro: false, error: error?.message || 'Restore failed. Please try again.' };
    }
  }

  async getProducts(): Promise<any[] | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const { offerings } = await Purchases.getOfferings();
      return offerings?.current?.availablePackages || null;
    } catch (error) {
      console.error('RevenueCat: Error getting products:', error);
      return null;
    }
  }

  onPurchaseStatusChanged(callback: (isPro: boolean) => void): () => void {
    this.purchaseListeners.push(callback);
    return () => {
      this.purchaseListeners = this.purchaseListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(isPro: boolean): void {
    this.purchaseListeners.forEach(cb => cb(isPro));
  }
}

export const purchaseService = new PurchaseService();
