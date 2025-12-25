import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.assignflow.app',
  appName: 'AssignFlow',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.lambda-url.us-east-1.on.aws']
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: true
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false
    },
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      showSpinner: false,
      androidSplashResourceName: "splash"
    }
  }
};

export default config;




