// Bangumi 表情包：把 bbcode 里的 (bgmNN) 与 ASCII 颜文字映射到图片地址，
// 供 BangumiText 内联渲染。映射规则与官网 bangumi/frontend 的 bbcode 一致。
export const ASCII_EMOJI = [
  '(=A=)',
  '(=w=)',
  '(-w=)',
  '(S_S)',
  '(=v=)',
  '(@_@)',
  '(=W=)',
  '(TAT)',
  '(T_T)',
  "(='=)",
  '(=3=)',
  "(= =')",
  '(=///=)',
  '(=.,=)',
  '(:P)',
  '(LOL)',
] as const;

const STICKER_DOMAIN = 'https://lain.bgm.tv';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EMOJI_REGEX = new RegExp(
  `\\(bgm\\d+\\)|${ASCII_EMOJI.map(escapeRegExp).join('|')}`,
  'g',
);

export type BangumiEmojiSegment =
  | { type: 'emoji'; value: string }
  | { type: 'text'; value: string };

export function parseBangumiEmoji(text: string): BangumiEmojiSegment[] {
  const segments: BangumiEmojiSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_REGEX)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'emoji', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function containsBangumiEmoji(text: string): boolean {
  EMOJI_REGEX.lastIndex = 0;
  return EMOJI_REGEX.test(text);
}

export function getBangumiEmojiUrl(stickerId: string): string | null {
  let id = -1;

  if (stickerId.startsWith('(bgm')) {
    const match = stickerId.match(/\d+/)?.[0];
    id = match ? parseInt(match, 10) + ASCII_EMOJI.length : -1;
  } else {
    id = ASCII_EMOJI.indexOf(stickerId as (typeof ASCII_EMOJI)[number]) + 1;
  }

  if (id >= 1 && id < 17) {
    return `${STICKER_DOMAIN}/img/smiles/${id}.gif`;
  }

  if (id >= 17 && id < 39) {
    const match = stickerId.match(/\d+/)?.[0];
    if (match === '11') {
      return `${STICKER_DOMAIN}/img/smiles/bgm/11.gif`;
    }
    return `${STICKER_DOMAIN}/img/smiles/bgm/${match}.png`;
  }

  if (id === 39) {
    return `${STICKER_DOMAIN}/img/smiles/bgm/23.gif`;
  }

  if (id >= 40 && id < 140) {
    const tvId = id - 39;
    const padded = tvId < 10 ? `0${tvId}` : String(tvId);
    return `${STICKER_DOMAIN}/img/smiles/tv/${padded}.gif`;
  }

  return null;
}
