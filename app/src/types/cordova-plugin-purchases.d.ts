// Type declarations for cordova-plugin-purchases
// This is a simplified type definition for RevenueCat Purchases SDK

declare module 'cordova-plugin-purchases' {
  export interface CustomerInfo {
    entitlements: {
      active: { [key: string]: EntitlementInfo };
      all: { [key: string]: EntitlementInfo };
    };
    originalPurchaseDate: string | null;
    firstSeen: string;
    originalAppUserId: string;
    nonSubscriptionTransactions: any[];
  }

  export interface EntitlementInfo {
    identifier: string;
    isActive: boolean;
    willRenew: boolean;
    latestPurchaseDate: string;
    originalPurchaseDate: string;
    expirationDate: string | null;
    productIdentifier: string;
  }

  export interface Offering {
    identifier: string;
    availablePackages: Package[];
    metadata: { [key: string]: any };
  }

  export interface Offerings {
    current: Offering | null;
    all: { [key: string]: Offering };
  }

  export interface Package {
    identifier: string;
    packageType: string;
    product: Product;
    offeringIdentifier: string;
  }

  export interface Product {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
    introPrice: IntroPrice | null;
    discounts: Discount[] | null;
  }

  export interface IntroPrice {
    price: number;
    priceString: string;
    cycles: number;
    period: string;
    periodUnit: string;
    periodNumberOfUnits: number;
  }

  export interface Discount {
    identifier: string;
    price: number;
    priceString: string;
    cycles: number;
    period: string;
    periodUnit: string;
    periodNumberOfUnits: number;
  }

  export interface PurchaseResult {
    customerInfo: CustomerInfo;
    productIdentifier: string;
  }

  export class Purchases {
    static configure(apiKey: string, appUserId?: string): void;
    static getCustomerInfo(): Promise<CustomerInfo>;
    static getOfferings(): Promise<Offerings>;
    static purchasePackage(packageObj: Package): Promise<PurchaseResult>;
    static purchaseProduct(productIdentifier: string): Promise<PurchaseResult>;
    static restorePurchases(): Promise<CustomerInfo>;
    static syncPurchases(): Promise<void>;
    static addCustomerInfoUpdateListener(callback: (customerInfo: CustomerInfo) => void): void;
    static removeCustomerInfoUpdateListener(callback: (customerInfo: CustomerInfo) => void): void;
    static setDebugLogsEnabled(enabled: boolean): void;
    static setLogLevel(level: 'VERBOSE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): void;
  }
}
