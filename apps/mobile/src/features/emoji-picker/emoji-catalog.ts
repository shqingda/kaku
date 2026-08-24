import {
  ASCII_EMOJI,
  getBangumiEmojiUrl,
} from '@/lib/bangumi-emoji';

export type PickerEmoji = {
  sticker: string;
  url: string;
};

const BANGUMI_STICKER_COUNT = 123;

function padStart2(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

// 表情选择器收录 Bangumi 官网全部可解析的官方表情：ASCII 颜文字
// （ID 1–16）与 (bgm01)–(bgm123)。其中 (bgm24) 起对应官网的 tv 系列。
export const PICKER_EMOJI: PickerEmoji[] = [
  ...ASCII_EMOJI.map((sticker) => ({
    sticker,
    url: getBangumiEmojiUrl(sticker),
  })),
  ...Array.from({ length: BANGUMI_STICKER_COUNT }, (_, index) => ({
    sticker: `(bgm${padStart2(index + 1)})`,
    url: getBangumiEmojiUrl(`(bgm${padStart2(index + 1)})`),
  })),
].filter((item): item is PickerEmoji => item.url !== null);
