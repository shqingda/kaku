import { requireOptionalNativeModule } from 'expo';

// expo-alternate-app-icons 的原生模块。它的 JS 入口在模块缺失时会直接抛错，
// 所以这里改用可选加载：旧安装包没有这个模块时返回 null，由界面明确提示。
type NativeAppIcons = {
  supportsAlternateIcons: boolean;
  getAppIconName(): string | null;
  setAlternateAppIcon(name: string | null): Promise<string | null>;
};

export function loadNativeAppIcons(): NativeAppIcons | null {
  const native = requireOptionalNativeModule<NativeAppIcons>('ExpoAlternateAppIcons');
  return native?.supportsAlternateIcons ? native : null;
}
