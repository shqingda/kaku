// 按 EAS 构建环境动态设置包名：
// - production：正式包名 com.shqingda.kaku（Play 上架用）
// - 本地与 debug 构建（无 EAS_BUILD_PROFILE）：com.shqingda.kaku.debug。
const EAS_BUILD_PROFILE = process.env.EAS_BUILD_PROFILE;

const isProduction = EAS_BUILD_PROFILE === 'production';
const suffix = isProduction ? '' : '.debug';
const channel = isProduction ? 'production' : 'debug';
const iconDirectory = './assets/images/app-icons';
const lightIcon = `${iconDirectory}/kaku-${channel}-light.png`;
const darkIcon = `${iconDirectory}/kaku-${channel}-dark.png`;
const foregroundIcon = `${iconDirectory}/kaku-${channel}-foreground.png`;
const monochromeIcon = `${iconDirectory}/kaku-${channel}-monochrome.png`;
const sentryPlugin =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG
    ? [
        [
          '@sentry/react-native',
          {
            url: 'https://sentry.io',
            project: 'kaku',
            organization: process.env.SENTRY_ORG,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          },
        ],
      ]
    : [];

module.exports = {
  expo: {
    name: 'Kaku',
    slug: 'kaku',
    version: '1.1.0',
    orientation: 'portrait',
    icon: lightIcon,
    scheme: 'kaku',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: `com.shqingda.kaku${suffix}`,
      icon: {
        dark: darkIcon,
        light: lightIcon,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: '允许 Kaku 扫描二维码连接开发服务器。',
        UIBackgroundModes: ['remote-notification'],
      },
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#DA6E80',
        foregroundImage: foregroundIcon,
        monochromeImage: monochromeIcon,
      },
      icon: lightIcon,
      googleServicesFile: './google-services.json',
      predictiveBackGestureEnabled: false,
      package: `com.shqingda.kaku${suffix}`,
      permissions: [
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
      'expo-router',
      'expo-image',
      ['expo-camera', { barcodeScannerEnabled: false }],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#C96878',
          dark: {
            backgroundColor: '#0E0E10',
            image: './assets/images/kaku-mark.png',
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
          icon: './assets/images/kaku-mark.png',
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
      ...sentryPlugin,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '65b88c02-a4de-4cfa-abbb-b4a2cbbd0861',
      },
    },
    owner: 'shqingda',
  },
};
