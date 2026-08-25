import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type { PublicTagPage } from './model.ts';

const BANGUMI_WEB_URL = 'https://bgm.tv';
const MAX_HTML_BYTES = 1_000_000;

const SUBJECT_TYPE_SLUGS: Record<number, string> = {
  1: 'book',
  2: 'anime',
  3: 'music',
  4: 'game',
  6: 'real',
};

export class BangumiTagListError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiTagListError';
    this.status = status;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

async function readBoundedHtml(response: Response) {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new BangumiTagListError(502, 'Bangumi 标签页面过大。');
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

export function parseBangumiTagPage(html: string, page: number): PublicTagPage {
  const listStart = html.indexOf('<div id="tagList">');
  const listEnd = html.indexOf('<hr class="board"', listStart);
  const listHtml = listStart >= 0
    ? html.slice(listStart, listEnd >= 0 ? listEnd : undefined)
    : '';
  const items = [
    ...listHtml.matchAll(
      /<a href="\/(?:anime|book|music|game|real)\/tag\/[^"]+" class="l level\d+">([\s\S]*?)<\/a>\s*<small class="grey">\((\d+)\)<\/small>/g,
    ),
  ].map((match) => ({
    count: Number(match[2]),
    name: decodeHtml(match[1]),
  }));
  const totalPagesMatch = html.match(
    /<span class="p_edge">\((?:&nbsp;|\s)*\d+(?:&nbsp;|\s)*\/(?:&nbsp;|\s)*(\d+)(?:&nbsp;|\s)*\)<\/span>/,
  );
  const totalPages = totalPagesMatch ? Number(totalPagesMatch[1]) : undefined;

  return {
    items,
    nextPage: items.length > 0 && (!totalPages || page < totalPages)
      ? page + 1
      : undefined,
    page,
    totalPages,
  };
}

export async function getBangumiTags({
  fetcher = fetch,
  page,
  subjectType,
}: {
  fetcher?: typeof fetch;
  page: number;
  subjectType: number;
}) {
  const slug = SUBJECT_TYPE_SLUGS[subjectType];
  if (!slug) throw new BangumiTagListError(400, '条目类型无效。');

  const url = page > 1
    ? `${BANGUMI_WEB_URL}/${slug}/tag?page=${page}`
    : `${BANGUMI_WEB_URL}/${slug}/tag`;
  const response = await fetcher(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new BangumiTagListError(
      response.status,
      `Bangumi 标签请求失败（${response.status}）`,
    );
  }

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_HTML_BYTES) {
    throw new BangumiTagListError(502, 'Bangumi 标签页面过大。');
  }

  const result = parseBangumiTagPage(await readBoundedHtml(response), page);
  if (result.items.length === 0 && page === 1) {
    reportHtmlParseFailure({ page, parser: 'tags', url });
    throw new BangumiTagListError(502, 'Bangumi 标签页面结构已变化。');
  }
  return result;
}
