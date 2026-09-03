// 间距阶梯：一致的呼吸感。页面级区块间距优先取 xl/xxl，卡片内取 md/lg。
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// 字号阶梯（Apple 排版原则：字距随字号变化，大字号收紧、小字号微放）。
// 中文字形本身自带字面间距，因此只对 20pt 以上收紧、13pt 以下微放。
export const TYPE = {
  display: { fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  titleLarge: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 24, letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  micro: { fontSize: 11, lineHeight: 15, letterSpacing: 0.3 },
} as const;

export const HIT_SLOP = 8;
export const MIN_TOUCH_SIZE = 44;
