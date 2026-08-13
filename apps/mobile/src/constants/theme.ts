export type ThemeColors = {
  accent: string;
  accentRich: string;
  accentSoft: string;
  background: string;
  ink: string;
  muted: string;
  subtle: string;
  surface: string;
  // 软表面（输入框、chip 背景），浅色下为 #F7F6F2
  surfaceSoft: string;
  // 头像/徽标背景，浅色下为 #EFEEE9
  surfaceAlt: string;
  // 分隔线，浅色下为 #ECE9E2
  divider: string;
  // 浅色轨道/描边，浅色下为 #E6E4DE
  track: string;
  // 输入框描边，浅色下为 #D8D3CA
  inputBorder: string;
};

export const LIGHT_COLORS: ThemeColors = {
  accent: '#C96878',
  accentRich: '#B05064',
  accentSoft: '#F6E7EA',
  background: '#F5F4F0',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  subtle: '#73737A',
  surface: '#FFFFFF',
  surfaceSoft: '#F7F6F2',
  surfaceAlt: '#EFEEE9',
  divider: '#ECE9E2',
  track: '#E6E4DE',
  inputBorder: '#D8D3CA',
};

export const DARK_COLORS: ThemeColors = {
  accent: '#D98A9B',
  accentRich: '#E5A5B4',
  accentSoft: '#3A2228',
  background: '#0E0E10',
  ink: '#F5F5F7',
  muted: '#A1A1A6',
  subtle: '#8E8E93',
  surface: '#1C1C1E',
  surfaceSoft: '#2C2C2E',
  surfaceAlt: '#2A2A2C',
  divider: '#2C2C2E',
  track: '#2C2C2E',
  inputBorder: '#3A3A3C',
};
