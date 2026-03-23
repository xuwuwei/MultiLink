import { Capacitor } from '@capacitor/core';

// AdMob configuration
const ADMOB_BANNER_AD_UNIT_ID = 'ca-app-pub-3194974237255578/7623600144';

// Test ad unit IDs for development
const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

export interface AdConfig {
  enabled: boolean;
  adUnitId: string;
  position: 'bottom' | 'top';
  testMode: boolean;
}

class AdService {
  private initialized = false;
  private bannerVisible = false;
  private config: AdConfig = {
    enabled: true,
    adUnitId: ADMOB_BANNER_AD_UNIT_ID,
    position: 'bottom',
    testMode: true, // Enable test mode by default
  };
  private bannerElement: HTMLElement | null = null;
  private snoozeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SNOOZE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize AdMob on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        // TODO: Initialize actual AdMob SDK
        // import { AdMob } from '@capacitor-community/admob';
        // await AdMob.initialize({
        //   requestTrackingAuthorization: true,
        //   testingDevices: [],
        //   initializeForTesting: this.config.testMode,
        // });
        console.log('AdMob initialized (test mode)');
      } catch (error) {
        console.error('AdMob initialization error:', error);
      }
    }

    this.initialized = true;
  }

  /**
   * Show banner ad
   */
  async showBanner(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.bannerVisible) {
      return;
    }

    // For web/non-native platforms, show a simulated test ad
    if (!Capacitor.isNativePlatform()) {
      this.showTestBanner();
      return;
    }

    try {
      // TODO: Implement actual AdMob banner
      // import { AdMob, BannerAdOptions, BannerAdPosition } from '@capacitor-community/admob';
      //
      // const options: BannerAdOptions = {
      //   adId: this.config.testMode ? TEST_BANNER_AD_UNIT_ID : this.config.adUnitId,
      //   position: BannerAdPosition.BOTTOM_CENTER,
      //   margin: 0,
      //   isTesting: this.config.testMode,
      // };
      //
      // await AdMob.showBanner(options);

      // For now, show test banner on native too
      this.showTestBanner();
    } catch (error) {
      console.error('Error showing banner:', error);
    }
  }

  // Callback for when user clicks "Remove Ads"
  private onRemoveAdsCallback: (() => void) | null = null;

  /**
   * Set callback for when user wants to remove ads (purchase Pro)
   */
  setOnRemoveAdsCallback(callback: () => void): void {
    this.onRemoveAdsCallback = callback;
  }

  /**
   * Show a test banner for development
   * Banner is centered and sized to actual ad dimensions (320x50 or 468x60)
   */
  private showTestBanner(): void {
    if (this.bannerElement) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'admob-test-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 468px;
      min-width: 320px;
      height: 60px;
      background: linear-gradient(135deg, #4285f4, #34a853);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      box-sizing: border-box;
      border-radius: 8px 8px 0 0;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
    `;

    banner.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        width: 100%;
        justify-content: space-between;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        ">
          <div style="
            background: white;
            color: #4285f4;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
          ">Ad</div>
          <div style="overflow: hidden;">
            <div style="font-size: 13px; font-weight: 600; white-space: nowrap;">Test Ad</div>
            <div style="font-size: 10px; opacity: 0.9; white-space: nowrap;">AdMob Banner</div>
          </div>
        </div>
        <button id="close-test-ad" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        ">✕</button>
      </div>
    `;

    document.body.appendChild(banner);
    this.bannerElement = banner;
    this.bannerVisible = true;

    // Add close handler - opens purchase modal instead of directly removing
    banner.querySelector('#close-test-ad')?.addEventListener('click', () => {
      if (this.onRemoveAdsCallback) {
        this.onRemoveAdsCallback();
      }
    });

    console.log('Test banner ad shown');
  }

  /**
   * Hide banner ad
   */
  async hideBanner(): Promise<void> {
    if (!this.bannerVisible) {
      return;
    }

    try {
      // TODO: Hide actual AdMob banner
      // if (Capacitor.isNativePlatform()) {
      //   import { AdMob } from '@capacitor-community/admob';
      //   await AdMob.hideBanner();
      // }

      // Hide test banner
      if (this.bannerElement) {
        this.bannerElement.style.display = 'none';
      }

      this.bannerVisible = false;
      console.log('Banner ad hidden');
    } catch (error) {
      console.error('Error hiding banner:', error);
    }
  }

  /**
   * Remove banner ad completely
   */
  async removeBanner(): Promise<void> {
    try {
      // TODO: Remove actual AdMob banner
      // if (Capacitor.isNativePlatform()) {
      //   import { AdMob } from '@capacitor-community/admob';
      //   await AdMob.removeBanner();
      // }

      // Remove test banner
      if (this.bannerElement && this.bannerElement.parentNode) {
        this.bannerElement.parentNode.removeChild(this.bannerElement);
        this.bannerElement = null;
      }

      this.bannerVisible = false;

      // Start snooze timer to show ad again after 5 minutes
      this.startSnoozeTimer();
    } catch (error) {
      console.error('Error removing banner:', error);
    }
  }

  /**
   * Start snooze timer - ad will reappear after 5 minutes
   */
  private startSnoozeTimer(): void {
    // Clear any existing timer
    if (this.snoozeTimer) {
      clearTimeout(this.snoozeTimer);
      this.snoozeTimer = null;
    }

    // Only start timer if ads are still enabled
    if (!this.config.enabled) {
      return;
    }

    console.log(`Ad snoozed, will reappear in ${this.SNOOZE_DURATION / 60000} minutes`);

    this.snoozeTimer = setTimeout(() => {
      console.log('Snooze period ended, showing ad again');
      this.showBanner();
    }, this.SNOOZE_DURATION);
  }

  /**
   * Clear snooze timer (call when ads are disabled)
   */
  private clearSnoozeTimer(): void {
    if (this.snoozeTimer) {
      clearTimeout(this.snoozeTimer);
      this.snoozeTimer = null;
    }
  }

  /**
   * Check if banner is visible
   */
  isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  /**
   * Disable ads (after purchase)
   */
  disableAds(): void {
    this.config.enabled = false;
    this.clearSnoozeTimer();
    this.removeBanner();
  }

  /**
   * Enable ads
   */
  enableAds(): void {
    this.config.enabled = true;
  }

  /**
   * Check if ads are enabled
   */
  areAdsEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set test mode
   */
  setTestMode(enabled: boolean): void {
    this.config.testMode = enabled;
  }
}

export const adService = new AdService();
