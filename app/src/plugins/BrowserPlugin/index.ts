import { registerPlugin } from '@capacitor/core';

export interface BrowserPlugin {
  openUrl(options: { url: string }): Promise<void>;
}

const Browser = registerPlugin<BrowserPlugin>('Browser', {
  web: {
    openUrl: async ({ url }: { url: string }) => {
      window.open(url, '_blank');
    },
  },
});

export const browserService = {
  openUrl(url: string) {
    return Browser.openUrl({ url });
  },
};
