export type AppIconId = 'ink' | 'color' | 'lower';
export type AppIconEntry = { id: AppIconId; label: string; nativeName: string | null };
export const DEFAULT_APP_ICON: AppIconId;
export const ANDROID_ICON_BACKGROUND: string;
export const APP_ICONS: readonly AppIconEntry[];
export function appIconFiles(id: AppIconId, channel: 'production' | 'debug'): {
  iosLight: string;
  iosDark: string;
  iosTinted: string;
  foreground: string;
  monochrome: string;
};
export function alternateIconPluginEntries(channel: 'production' | 'debug'): unknown[];
