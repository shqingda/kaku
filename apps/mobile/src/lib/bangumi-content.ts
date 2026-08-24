export type BangumiContentBlock =
  | { type: 'text'; value: string }
  | { type: 'quote'; value: string }
  | { type: 'image'; value: string };

const BBCODE_TAG_RE = /\[\/?(?:b|i|u|s|mask|quote|code|url|img)(?:=[^\]]*)?\]/gi;
const IMG_TAG_RE = /\[img(?:=[^\]]*)?\]\s*(https?:\/\/[^\s\]]*)\s*\[\/img\]/gi;

export function cleanBangumiContent(content: string) {
  return content
    .replace(BBCODE_TAG_RE, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

// 把一段 bbcode 文本切成「文本 / 图片」序列：`[img]<URL>[/img]` 提取成
// image 块（仅接受 http(s) 外链，避免把任意内容当图片 URL），其余 bbcode
// 标签照旧清除。
function parseImageBlocks(content: string): BangumiContentBlock[] {
  const blocks: BangumiContentBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = IMG_TAG_RE.exec(content)) !== null) {
    const before = cleanBangumiContent(content.slice(lastIndex, match.index));
    if (before) {
      blocks.push({ type: 'text', value: before });
    }
    blocks.push({ type: 'image', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  const tail = cleanBangumiContent(content.slice(lastIndex));
  if (tail) {
    blocks.push({ type: 'text', value: tail });
  }

  return blocks;
}

// 把 bbcode 文本切成「普通文本 / 引用块 / 图片」序列，保留 [quote]...[/quote]
// 结构，供回复正文渲染出块引用样式（类似 Markdown 引用）。图片与引用块
// 之外的 bbcode 标签照旧清除。
export function parseBangumiContent(content: string): BangumiContentBlock[] {
  const blocks: BangumiContentBlock[] = [];
  const quoteRegex = /\[quote(?:=[^\]]*)?\]([\s\S]*?)\[\/quote\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = quoteRegex.exec(content)) !== null) {
    blocks.push(...parseImageBlocks(content.slice(lastIndex, match.index)));

    const quoted = cleanBangumiContent(match[1]);
    if (quoted) {
      blocks.push({ type: 'quote', value: quoted });
    }

    lastIndex = match.index + match[0].length;
  }

  blocks.push(...parseImageBlocks(content.slice(lastIndex)));

  return blocks;
}
