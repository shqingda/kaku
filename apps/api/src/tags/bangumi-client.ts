import { BANGUMI_USER_AGENT, BANGUMI_WEB_URL } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type { PublicTagPage } from './model.ts';
import { MAX_HTML_BYTES, decodeEntities, readBoundedHtml } from '../bangumi-html.ts';


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
    name: decodeEntities(match[1]).trim(),
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

  const html = await readBoundedHtml(
    response,
    () => new BangumiTagListError(502, 'Bangumi 标签页面过大。'),
  );
  const result = parseBangumiTagPage(html, page);
  if (result.items.length === 0 && page === 1) {
    reportHtmlParseFailure({ page, parser: 'tags', url });
    throw new BangumiTagListError(502, 'Bangumi 标签页面结构已变化。');
  }
  return result;
}
