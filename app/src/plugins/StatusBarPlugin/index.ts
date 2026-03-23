import { StatusBar, Style } from '@capacitor/status-bar';

export const initStatusBar = async () => {
  try {
    // 设置状态栏透明背景（完全透明）
    await StatusBar.setBackgroundColor({ color: '#00000000' });

    // 设置状态栏为 dark 模式（白色文字）
    await StatusBar.setStyle({ style: Style.Dark });

    // 设置全屏显示，内容延伸到状态栏下方（状态栏透明覆盖）
    await StatusBar.setOverlaysWebView({ overlay: true });

    console.log('Status bar initialized successfully');
  } catch (error) {
    console.error('Failed to initialize status bar:', error);
  }
};

export const setStatusBarStyle = async (isLightTheme: boolean) => {
  try {
    // 浅色主题需要深色文字 -> Style.Dark
    // 深色主题需要浅色文字 -> Style.Light
    const style = isLightTheme ? Style.Dark : Style.Light;
    await StatusBar.setStyle({ style });
    console.log('Status bar style updated:', isLightTheme ? 'Dark text for light theme' : 'Light text for dark theme');
  } catch (error) {
    console.error('Failed to set status bar style:', error);
  }
};

export const hideStatusBar = async () => {
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Failed to hide status bar:', error);
  }
};

export const showStatusBar = async () => {
  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Failed to show status bar:', error);
  }
};
