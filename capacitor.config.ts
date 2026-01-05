

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'af.khana.app',
  appName: 'خانه',
  webDir: 'dist',
  // Fix: Remove deprecated 'bundledWebRuntime' property which is not supported in recent Capacitor versions
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#ffffff'
  }
};

export default config;
