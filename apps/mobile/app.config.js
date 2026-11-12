// 按本地构建配置动态设置包名：
// - production：正式包名 com.shqingda.kaku。
// - 本地与 debug 构建（无 KAKU_BUILD_PROFILE）：com.shqingda.kaku.debug。
const { resolveApiUrl } = require('./config/api-url.cjs');
const {
  ANDROID_ICON_BACKGROUND,
  DEFAULT_APP_ICON,
  alternateIconPluginEntries,
  appIconFiles,
} = require('./config/app-icons.cjs');
const KAKU_BUILD_PROFILE = process.env.KAKU_BUILD_PROFILE;

const isProduction = KAKU_BUILD_PROFILE === 'production';
// 正式 Android 包默认启用 R8 与资源裁剪；显式设为 0 可生成诊断对照包。
const apiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_KAKU_API_URL, isProduction);
const optimizeNative = isProduction && process.env.KAKU_OPTIMIZE_NATIVE !== '0';
const suffix = isProduction ? '' : '.debug';
const apnsEnvironment = process.env.KAKU_APNS_ENVIRONMENT || (isProduction ? 'production' : 'sandbox');
if (!['sandbox', 'production'].includes(apnsEnvironment)) throw new Error('KAKU_APNS_ENVIRONMENT 必须为 sandbox 或 production');
const channel = isProduction ? 'production' : 'debug';
const defaultIcon = appIconFiles(DEFAULT_APP_ICON, channel);
module.exports = {
  expo: {
    name: 'Kaku',
    version: '1.1.26',
    orientation: 'portrait',
    icon: defaultIcon.iosLight,
    scheme: 'kaku',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: `com.shqingda.kaku${suffix}`,
      entitlements: { 'aps-environment': apnsEnvironment === 'sandbox' ? 'development' : 'production' },
      icon: {
        dark: defaultIcon.iosDark,
        light: defaultIcon.iosLight,
        tinted: defaultIcon.iosTinted,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: '允许 Kaku 扫描二维码连接开发服务器。',
        UIBackgroundModes: ['remote-notification'],
      },
      supportsTablet: false,
    },
    android: {
      versionCode: 13,
      adaptiveIcon: {
        backgroundColor: ANDROID_ICON_BACKGROUND,
        foregroundImage: defaultIcon.foreground,
        monochromeImage: defaultIcon.monochrome,
      },
      icon: defaultIcon.iosLight,
      googleServicesFile: './google-services.json',
      predictiveBackGestureEnabled: false,
      package: `com.shqingda.kaku${suffix}`,
      permissions: [
        ...(process.env.KAKU_UPDATE_CHANNEL === 'github' ? ['android.permission.REQUEST_INSTALL_PACKAGES'] : []),
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/kaku-icon.png',
    },
    plugins: [
      ['expo-build-properties', {
        android: {
          minSdkVersion: 29,
          enableMinifyInReleaseBuilds: optimizeNative,
          enableShrinkResourcesInReleaseBuilds: optimizeNative,
        },
      }],
      'expo-router',
      ['expo-alternate-app-icons', alternateIconPluginEntries(channel)],
      'expo-image',
      'expo-font',
      'expo-status-bar',
      'expo-web-browser',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFFFF',
          dark: {
            backgroundColor: '#16131A',
            image: './assets/images/kaku-mark-dark.png',
          },
          image: './assets/images/kaku-mark.png',
          imageWidth: 116,
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission: '允许 Kaku 访问照片。',
          savePhotosPermission: '允许 Kaku 将封面保存到照片。',
          granularPermissions: ['photo'],
        },
      ],
      [
        'expo-notifications',
        {
          color: '#C96878',
          defaultChannel: 'kaku-default',
          icon: './assets/images/kaku-mark-monochrome.png',
        },
      ],
      [
        'expo-quick-actions',
        {
          androidIcons: {
            calendar_month: {
              backgroundColor: '#C96878',
              foregroundImage: './assets/images/app-icons/shortcuts/calendar_month.png',
            },
            search: {
              backgroundColor: '#C96878',
              foregroundImage: './assets/images/app-icons/shortcuts/search.png',
            },
            leaderboard: {
              backgroundColor: '#C96878',
              foregroundImage: './assets/images/app-icons/shortcuts/leaderboard.png',
            },
            filter_alt: {
              backgroundColor: '#C96878',
              foregroundImage: './assets/images/app-icons/shortcuts/filter_alt.png',
            },
          },
        },
      ],
      'expo-secure-store',
      'expo-sqlite',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl,
      appUpdate: {
        channel: process.env.KAKU_UPDATE_CHANNEL || 'store',
        iosAppStoreId: process.env.KAKU_IOS_APP_STORE_ID || '',
        iosCountry: process.env.KAKU_IOS_STORE_COUNTRY || 'cn',
      },
      router: {},
      push: { apnsEnvironment, apnsTopic: `com.shqingda.kaku${suffix}` },
    },
    owner: 'shqingda',
  },
};
