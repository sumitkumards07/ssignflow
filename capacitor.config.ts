import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.assignflow.app',
  appName: 'AssignFlow',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.lambda-url.us-east-1.on.aws', 'ywal432feojibun3d7jziamzbq0zwiew.lambda-url.us-east-1.on.aws']
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
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      showSpinner: false,
      androidSplashResourceName: "splash"
    },
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: true,
      directUpdate: false,
      statsUrl: ""
    }
  }
};

export default config;




