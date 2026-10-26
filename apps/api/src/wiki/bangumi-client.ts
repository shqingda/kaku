import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type { PublicWikiRevisionFeed } from './model.ts';
import { MAX_HTML_BYTES, htmlToText, parseBangumiTime, readBoundedHtml } from '../bangumi-html.ts';

const BANGUMI_WIKI_URL = 'https://bgm.tv/wiki';
const BANGUMI_WIKI_URLS = [BANGUMI_WIKI_URL, 'https://bangumi.tv/wiki'];

export class BangumiWikiFeedError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiWikiFeedError';
    this.status = status;
  }
}

export function parseBangumiWikiFeed(html: string): PublicWikiRevisionFeed {
  const listStart = html.indexOf('<ul id="wiki_act-all"');
  const listEnd = html.indexOf('</ul>', listStart);
  const listHtml = listStart >= 0
    ? html.slice(listStart, listEnd >= 0 ? listEnd : undefined)
    : '';
  const segments = listHtml.split(/<li class="line_(?:odd|even)">/).slice(1);

  const items = segments.flatMap((segment) => {
    const subjectMatch = segment.match(
      /<a href="\/subject\/(\d+)"[^>]*class="l">([\s\S]*?)<\/a>/,
    );
    const authorMatch = segment.match(
      /by\s*<a href="\/user\/([^"/]+)">([\s\S]*?)<\/a>/,
    );
    const revisionMatch = segment.match(
      /<span class="rr">([\s\S]*?)\s*\/\s*<a href="([^"]+)" class="l">对比<\/a>/,
    );
    if (!subjectMatch || !authorMatch || !revisionMatch) return [];

    const metadata = segment.slice(
      segment.indexOf('<small class="grey">') + '<small class="grey">'.length,
      segment.indexOf('by <a href="/user/'),
    );

    return [{
      author: htmlToText(authorMatch[2], { lineBreaks: false }),
      authorUsername: htmlToText(authorMatch[1], { lineBreaks: false }),
      editedAt: parseBangumiTime(revisionMatch[1]),
      note: htmlToText(metadata, { lineBreaks: false }).replace(/^\(|\)$/g, ''),
      revisionUrl: new URL(
        revisionMatch[2].replace(/&amp;/g, '&'),
        BANGUMI_WIKI_URL,
      ).toString(),
      subjectId: Number(subjectMatch[1]),
      title: htmlToText(subjectMatch[2], { lineBreaks: false }),
    }];
  });

  return { items };
}

export async function getBangumiWikiFeed({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}) {
  let lastError: unknown;

  for (const url of BANGUMI_WIKI_URLS) {
    try {
      const response = await fetcher(url, {
        headers: {
          Accept: 'text/html',
          'User-Agent': BANGUMI_USER_AGENT,
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new BangumiWikiFeedError(
          response.status,
          `Bangumi 维基请求失败（${response.status}）`,
        );
      }
      const contentLength = Number(response.headers.get('Content-Length') ?? 0);
      if (contentLength > MAX_HTML_BYTES) {
        throw new BangumiWikiFeedError(502, 'Bangumi 维基页面过大。');
      }

      const html = await readBoundedHtml(
        response,
        () => new BangumiWikiFeedError(502, 'Bangumi 维基页面过大。'),
      );
      const result = parseBangumiWikiFeed(html);
      if (result.items.length === 0) {
        reportHtmlParseFailure({ parser: 'wiki', url });
        throw new BangumiWikiFeedError(502, 'Bangumi 维基页面结构已变化。');
      }
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof BangumiWikiFeedError) throw lastError;
  throw new BangumiWikiFeedError(502, 'Bangumi 维基请求失败。');
}
