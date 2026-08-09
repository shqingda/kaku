import type { PublicBlogPage } from './model.ts';

const BANGUMI_WEB_URL = 'https://bgm.tv';
const MAX_HTML_LENGTH = 1_000_000;

const BLOG_PATHS = {
  all: 'blog',
  anime: 'anime/blog',
  book: 'book/blog',
  game: 'game/blog',
  music: 'music/blog',
  real: 'real/blog',
} as const;

export type BlogType = keyof typeof BLOG_PATHS;

export class BangumiBlogListError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiBlogListError';
    this.status = status;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function secureUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

function parseBangumiTime(segment: string) {
  const match = segment.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
  );
  if (!match) return 0;

  const [, year, month, day, hour, minute] = match.map(Number);
  return Math.floor(
    Date.UTC(year, month - 1, day, hour - 8, minute) / 1000,
  );
}

export function parseBangumiBlogPage(html: string, page: number): PublicBlogPage {
  const listStart = html.indexOf('id="entry_list"');
  const listEnd = html.indexOf('<div class="page_inner">', listStart);
  const listHtml =
    listStart >= 0
      ? html.slice(listStart, listEnd >= 0 ? listEnd : undefined)
      : '';
  const segments = listHtml.split(/<div class="item clearit"/).slice(1);

  const items = segments.flatMap((segment) => {
    const titleMatch = segment.match(
      /<h2 class="title"><a href="\/blog\/(\d+)" class="l">([\s\S]*?)<\/a>/,
    );
    const authorMatch = segment.match(
      /<a href="\/user\/([^"/]+)" class="l">([\s\S]*?)<\/a>/,
    );
    if (!titleMatch || !authorMatch) return [];

    const summaryMatch = segment.match(
      /<div class="content"><a href="\/blog\/\d+">([\s\S]*?)<\/a><\/div>/,
    );
    const coverMatch = segment.match(/<img src="([^"]+)"/);
    const replyMatch = segment.match(/>(\d+)\s*回复<\/a>/);

    return [{
      author: decodeHtml(authorMatch[2]),
      authorUsername: decodeHtml(authorMatch[1]),
      coverUrl: secureUrl(coverMatch?.[1]),
      id: Number(titleMatch[1]),
      replyCount: Number(replyMatch?.[1] ?? 0),
      summary: decodeHtml(summaryMatch?.[1] ?? ''),
      title: decodeHtml(titleMatch[2]),
      updatedAt: parseBangumiTime(segment),
    }];
  });
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

export async function getBangumiBlogs({
  fetcher = fetch,
  page,
  type,
}: {
  fetcher?: typeof fetch;
  page: number;
  type: BlogType;
}) {
  const basePath = BLOG_PATHS[type];
  const path = page === 1 ? `/${basePath}` : `/${basePath}/${page}.html`;
  const response = await fetcher(`${BANGUMI_WEB_URL}${path}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Kaku/1.0 (https://github.com/shqingda/kaku)',
    },
  });

  if (!response.ok) {
    throw new BangumiBlogListError(
      response.status,
      `Bangumi 日志请求失败（${response.status}）`,
    );
  }

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_HTML_LENGTH) {
    throw new BangumiBlogListError(502, 'Bangumi 日志页面过大。');
  }

  const html = await response.text();
  if (html.length > MAX_HTML_LENGTH) {
    throw new BangumiBlogListError(502, 'Bangumi 日志页面过大。');
  }

  const result = parseBangumiBlogPage(html, page);
  if (result.items.length === 0 && page === 1) {
    throw new BangumiBlogListError(502, 'Bangumi 日志页面结构已变化。');
  }
  return result;
}
