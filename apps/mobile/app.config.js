// 按 EAS 构建环境动态设置包名：
// - production：正式包名 com.shqingda.kaku（Play 上架用）
// - development：com.shqingda.kaku.dev（EAS dev client，可与正式版共存）
// - preview：com.shqingda.kaku.preview（独立内测包，可与正式版共存）
// - 本地（无 EAS_BUILD_PROFILE）：com.shqingda.kaku.debug。
const EAS_BUILD_PROFILE = process.env.EAS_BUILD_PROFILE;

function buildSuffix(profile) {
  if (!profile) return '.debug';
  if (profile === 'development') return '.dev';
  if (profile === 'preview') return '.preview';
  return '';
}

const suffix = buildSuffix(EAS_BUILD_PROFILE);

// 拆架构构建（preview-split-* profile）时，每个 APK 只包含一种 CPU 架构，
// 大小约 40MB，用户按设备架构下载对应版本。
// 未设置 EAS_ABI（development / production）时保留全架构。
const EAS_ABI = process.env.EAS_ABI;

module.exports = {
  expo: {
    name: 'Kaku',
    slug: 'kaku',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/kaku-icon.png',
    scheme: 'kaku',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: `com.shqingda.kaku${suffix}`,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: '允许 Kaku 扫描二维码连接开发服务器。',
      },
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#C96878',
        foregroundImage: './assets/images/kaku-mark-safe.png',
        monochromeImage: './assets/images/kaku-mark-safe.png',
      },
      predictiveBackGestureEnabled: false,
      package: `com.shqingda.kaku${suffix}`,
      abiFilters: EAS_ABI ? [EAS_ABI] : undefined,
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
        '@sentry/react-native',
        {
          url: 'https://sentry.io',
          project: 'kaku',
          organization: process.env.SENTRY_ORG,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          uploadSourceMaps: Boolean(process.env.SENTRY_AUTH_TOKEN),
        },
      ],
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
