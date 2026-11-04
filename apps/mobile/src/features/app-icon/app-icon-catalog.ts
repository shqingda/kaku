import {
  APP_ICONS,
  DEFAULT_APP_ICON,
  type AppIconEntry,
  type AppIconId,
} from '../../../config/app-icons.cjs';

export type { AppIconId };
export { APP_ICONS, DEFAULT_APP_ICON };

// 缩略图跟随界面明暗：深色界面下显示图标的深色版本，和 iOS 主屏一致。
const PREVIEWS: Record<AppIconId, { dark: number; light: number }> = {
  ink: {
    dark: require('../../../assets/images/app-icons/previews/ink-dark.png'),
    light: require('../../../assets/images/app-icons/previews/ink-light.png'),
  },
  color: {
    dark: require('../../../assets/images/app-icons/previews/color-dark.png'),
    light: require('../../../assets/images/app-icons/previews/color-light.png'),
  },
  lower: {
    dark: require('../../../assets/images/app-icons/previews/lower-dark.png'),
    light: require('../../../assets/images/app-icons/previews/lower-light.png'),
  },
};

export function appIconPreview(id: AppIconId, scheme: 'dark' | 'light') {
  return PREVIEWS[id][scheme];
}

// 原生名 → 目录 id。主图标的原生名是 null；认不出的名字返回 null，界面不勾选任何一项。
export function appIconFromNativeName(name: string | null): AppIconEntry | null {
  return APP_ICONS.find((icon) => icon.nativeName === name) ?? null;
}
