// 应用图标目录：app.config.js（原生图标）与「应用图标」切换页共用这一份。
// nativeName 为 null 的是主图标；其余作为备用图标注册给 expo-alternate-app-icons。
const DEFAULT_APP_ICON = 'ink';
const ANDROID_ICON_BACKGROUND = '#FFFFFF';

const APP_ICONS = [
  { id: 'ink', label: '墨', nativeName: null },
  { id: 'color', label: '彩', nativeName: 'Color' },
  { id: 'lower', label: '小写', nativeName: 'Lower' },
];

function appIconFiles(id, channel) {
  const base = `./assets/images/app-icons/kaku-${id}-${channel}`;
  return {
    iosLight: `${base}-ios-light.png`,
    iosDark: `${base}-ios-dark.png`,
    iosTinted: `${base}-ios-tinted.png`,
    foreground: `${base}-foreground.png`,
    monochrome: `${base}-monochrome.png`,
  };
}

function alternateIconPluginEntries(channel) {
  return APP_ICONS.filter((icon) => icon.nativeName).map((icon) => {
    const files = appIconFiles(icon.id, channel);
    return {
      name: icon.nativeName,
      ios: { light: files.iosLight, dark: files.iosDark, tinted: files.iosTinted },
      android: {
        foregroundImage: files.foreground,
        backgroundColor: ANDROID_ICON_BACKGROUND,
        monochromeImage: files.monochrome,
      },
    };
  });
}

module.exports = { ANDROID_ICON_BACKGROUND, APP_ICONS, DEFAULT_APP_ICON, alternateIconPluginEntries, appIconFiles };
