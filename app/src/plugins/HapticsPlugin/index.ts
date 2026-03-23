import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// 检测设备是否支持震动
let isHapticsSupported: boolean | null = null;

const checkHapticsSupport = async (): Promise<boolean> => {
  if (isHapticsSupported !== null) return isHapticsSupported;
  
  // 如果不是原生平台，肯定不支持
  if (!Capacitor.isNativePlatform()) {
    isHapticsSupported = false;
    return false;
  }
  
  try {
    // 尝试触发一个轻触来测试支持
    await Haptics.impact({ style: ImpactStyle.Light });
    isHapticsSupported = true;
    return true;
  } catch (error) {
    console.log('Haptics not supported on this device');
    isHapticsSupported = false;
    return false;
  }
};

// 初始化时检测设备支持
let deviceSupportChecked = false;
let deviceSupportsHaptics = false;

checkHapticsSupport().then(supported => {
  deviceSupportsHaptics = supported;
  deviceSupportChecked = true;
  if (!supported) {
    console.log('Device does not support haptics feedback');
  }
});

export const hapticsService = {
  // 获取设备是否支持震动
  isSupported(): boolean {
    return deviceSupportsHaptics;
  },

  // 轻触反馈
  async lightImpact() {
    if (!deviceSupportsHaptics) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Haptics light impact failed:', error);
    }
  },

  // 中等反馈
  async mediumImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.error('Haptics medium impact failed:', error);
    }
  },

  // 重触反馈
  async heavyImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.error('Haptics heavy impact failed:', error);
    }
  },

  // 成功反馈
  async notificationSuccess() {
    try {
      await Haptics.notification({ type: 'success' as any });
    } catch (error) {
      console.error('Haptics notification success failed:', error);
    }
  },

  // 警告反馈
  async notificationWarning() {
    try {
      await Haptics.notification({ type: 'warning' as any });
    } catch (error) {
      console.error('Haptics notification warning failed:', error);
    }
  },

  // 错误反馈
  async notificationError() {
    try {
      await Haptics.notification({ type: 'error' as any });
    } catch (error) {
      console.error('Haptics notification error failed:', error);
    }
  },

  // 按键反馈（键盘按键使用）
  async keyPress() {
    await this.lightImpact();
  },

  // 开关切换反馈
  async toggle() {
    await this.mediumImpact();
  },

  // 长按反馈
  async longPress() {
    await this.heavyImpact();
  }
};
