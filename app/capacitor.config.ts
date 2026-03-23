import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.multilink.app',
  appName: 'MultiLink',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0a0a',
    scrollEnabled: false,
  },
};

export default config;
