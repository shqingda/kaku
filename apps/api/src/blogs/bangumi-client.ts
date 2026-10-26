import { BANGUMI_USER_AGENT, BANGUMI_WEB_URL } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type { PublicBlogPage } from './model.ts';
import { htmlToText, parseBangumiTime, secureUrl } from '../bangumi-html.ts';

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
      author: htmlToText(authorMatch[2]),
      authorUsername: htmlToText(authorMatch[1]),
      coverUrl: secureUrl(coverMatch?.[1]),
      id: Number(titleMatch[1]),
      replyCount: Number(replyMatch?.[1] ?? 0),
      summary: htmlToText(summaryMatch?.[1] ?? ''),
      title: htmlToText(titleMatch[2]),
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
      'User-Agent': BANGUMI_USER_AGENT,
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
    reportHtmlParseFailure({
      page,
      parser: 'blogs',
      url: response.url || `${BANGUMI_WEB_URL}${path}`,
    });
    throw new BangumiBlogListError(502, 'Bangumi 日志页面结构已变化。');
  }
  return result;
}
