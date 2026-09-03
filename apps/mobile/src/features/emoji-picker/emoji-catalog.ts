import {
  ASCII_EMOJI,
  getBangumiEmojiUrl,
} from '../../lib/bangumi-emoji.ts';

export type PickerEmoji = {
  sticker: string;
  url: string;
};

export type EmojiCategory = {
  key: string;
  label: string;
  items: PickerEmoji[];
};

const CLASSIC_BGM_COUNT = 23;
const BANGUMI_STICKER_COUNT = 123;

function padStart2(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function toPickerEmoji(sticker: string): PickerEmoji | null {
  const url = getBangumiEmojiUrl(sticker);
  return url ? { sticker, url } : null;
}

const asciiItems = ASCII_EMOJI.map(toPickerEmoji).filter(
  (item): item is PickerEmoji => item !== null,
);

const classicItems = Array.from(
  { length: CLASSIC_BGM_COUNT },
  (_, index) => `(bgm${padStart2(index + 1)})`,
)
  .map(toPickerEmoji)
  .filter((item): item is PickerEmoji => item !== null);

const moreItems = Array.from(
  { length: BANGUMI_STICKER_COUNT - CLASSIC_BGM_COUNT },
  (_, index) => `(bgm${padStart2(index + CLASSIC_BGM_COUNT + 1)})`,
)
  .map(toPickerEmoji)
  .filter((item): item is PickerEmoji => item !== null);

// 分组和 Stage1st 风格的表情面板一致：先按常见类别切换，再在网格中浏览。
// Bangumi 官方没有公开分类名，这里沿用官网目前最常用的三组：
// 颜文字、经典 (bgm01)–(bgm23)、更多 TV 系列 (bgm24)–(bgm123)。
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: 'ascii', label: '颜文字', items: asciiItems },
  { key: 'classic', label: '经典', items: classicItems },
  { key: 'more', label: '更多', items: moreItems },
];

export const PICKER_EMOJI: PickerEmoji[] = EMOJI_CATEGORIES.flatMap(
  (category) => category.items,
);
