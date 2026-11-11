import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.birrx.app',
  appName: 'BirrX',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

