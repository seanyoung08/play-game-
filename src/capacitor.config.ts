import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corner.shop',
  appName: '街角小店',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
