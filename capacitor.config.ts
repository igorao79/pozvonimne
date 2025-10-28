import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.pozvonimne.app',
  appName: 'ПозвониМне',
  webDir: 'out',
  server: {
    // Allow external URLs for OAuth and Supabase
    allowNavigation: [
      'uasoayoovlureephzkns.supabase.co',
      'accounts.google.com',
      'github.com',
    ],
  },
  plugins: {
    // Enable native HTTP for better compatibility with Supabase
    CapacitorHttp: {
      enabled: true,
    },
    // Enable native cookies for authentication
    CapacitorCookies: {
      enabled: true,
    },
    // Push notifications configuration
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Status bar configuration - фиксируем программно
    StatusBar: {
      overlaysWebView: false, // НЕ накладываем на веб-представление
      backgroundColor: '#ffffff', // Белый фон
      style: 'light', // Светлые иконки
    },
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    // Keyboard configuration
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
  // iOS specific configuration
  ios: {
    contentInset: 'never', // Предотвращаем автоматические insets
    limitsNavigationsToAppBoundDomains: true,
    // Дополнительные настройки для status bar
    scrollEnabled: true,
    allowsBackForwardNavigationGestures: false,
  },
  // Android specific configuration
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Настройки для предотвращения движения status bar
    backgroundColor: '#ffffff',
    // Отключаем некоторые оптимизации, которые могут влиять на status bar
    webContentsDebuggingEnabled: false,
    // Xiaomi/MIUI специфичные настройки
    // Предотвращаем любые системные overlay эффекты
    scrollEnabled: true,
    // Дополнительные WebView настройки для Xiaomi
    webView: {
      // overScrollMode не поддерживается, но другие настройки могут помочь
      scrollEnabled: true,
    }
  },
};

export default config;
