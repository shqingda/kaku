import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type { PublicWikiRevisionFeed } from './model.ts';

const BANGUMI_WIKI_URL = 'https://bgm.tv/wiki';
const BANGUMI_WIKI_URLS = [BANGUMI_WIKI_URL, 'https://bangumi.tv/wiki'];
const MAX_HTML_BYTES = 1_000_000;

export class BangumiWikiFeedError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiWikiFeedError';
    this.status = status;
  }
}

function decodeHtml(value: string) {
  return value
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

function parseBangumiTime(value: string) {
  const match = value.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
  );
  if (!match) return 0;

  const [, year, month, day, hour, minute] = match.map(Number);
  return Math.floor(
    Date.UTC(year, month - 1, day, hour - 8, minute) / 1000,
  );
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
      throw new BangumiWikiFeedError(502, 'Bangumi 维基页面过大。');
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
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
      author: decodeHtml(authorMatch[2]),
      authorUsername: decodeHtml(authorMatch[1]),
      editedAt: parseBangumiTime(revisionMatch[1]),
      note: decodeHtml(metadata).replace(/^\(|\)$/g, ''),
      revisionUrl: new URL(
        revisionMatch[2].replace(/&amp;/g, '&'),
        BANGUMI_WIKI_URL,
      ).toString(),
      subjectId: Number(subjectMatch[1]),
      title: decodeHtml(subjectMatch[2]),
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

      const result = parseBangumiWikiFeed(await readBoundedHtml(response));
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
