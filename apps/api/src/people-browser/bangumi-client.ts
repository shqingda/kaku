import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import { reportHtmlParseFailure } from '../html-parser-monitor.ts';
import type {
  PublicPeoplePage,
  PublicPersonKind,
  PublicPersonSummary,
} from './model.ts';

const BANGUMI_WEB_URL = 'https://bgm.tv';
const MAX_HTML_BYTES = 1_000_000;

export type PeopleSort = 'collects' | 'comment' | 'dateline' | 'title';

export class BangumiPeopleListError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiPeopleListError';
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
  if (!value || value.startsWith('/img/info_only')) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${BANGUMI_WEB_URL}${value}`;
  return value.replace(/^http:/, 'https:');
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
      throw new BangumiPeopleListError(502, 'Bangumi 人物页面过大。');
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

export function parseBangumiPeoplePage(
  html: string,
  page: number,
): PublicPeoplePage {
  const listStart = html.indexOf('class="browserCrtList"');
  const listEnd = html.indexOf('<div id="multipage"', listStart);
  const listHtml = listStart >= 0
    ? html.slice(listStart, listEnd >= 0 ? listEnd : undefined)
    : '';
  const parts = listHtml.split(
    /<div id="item_(character|person)(\d+)"[^>]*>/,
  );
  const items: PublicPersonSummary[] = [];

  for (let index = 1; index + 2 < parts.length; index += 3) {
    const kind = parts[index] as PublicPersonKind;
    const id = Number(parts[index + 1]);
    const segment = parts[index + 2];
    const nameMatch = segment.match(
      new RegExp(`<a href="/${kind}/${id}" class="l">([\\s\\S]*?)</a>`),
    );
    if (!nameMatch) continue;

    const imageMatch = segment.match(/<img src="([^"]+)"/);
    const metadataMatch = segment.match(
      /<span class="tip">([\s\S]*?)<\/span>/,
    );
    const commentMatch = segment.match(
      /<small class="na">\(\+(\d+)\)<\/small>/,
    );
    const categories = [
      ...segment.matchAll(/<span class="badge_job">([\s\S]*?)<\/span>/g),
    ].map((match) => decodeHtml(match[1]));

    items.push({
      categories,
      commentCount: Number(commentMatch?.[1] ?? 0),
      id,
      imageUrl: secureUrl(imageMatch?.[1]),
      kind,
      metadata: decodeHtml(metadataMatch?.[1] ?? '')
        .replace(/^\s*\/\s*/, ''),
      name: decodeHtml(nameMatch[1]),
    });
  }

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

export async function getBangumiPeople({
  fetcher = fetch,
  gender,
  kind,
  page,
  sort,
  type,
}: {
  fetcher?: typeof fetch;
  gender?: number;
  kind: PublicPersonKind;
  page: number;
  sort: PeopleSort;
  type?: number;
}) {
  const query = new URLSearchParams();
  if (type) query.set('type', String(type));
  if (gender) query.set('gender', String(gender));
  if (sort !== 'dateline') query.set('orderby', sort);
  if (page > 1) query.set('page', String(page));
  const url = query.size > 0
    ? `${BANGUMI_WEB_URL}/${kind}?${query}`
    : `${BANGUMI_WEB_URL}/${kind}`;
  const response = await fetcher(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new BangumiPeopleListError(
      response.status,
      `Bangumi 人物请求失败（${response.status}）`,
    );
  }

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_HTML_BYTES) {
    throw new BangumiPeopleListError(502, 'Bangumi 人物页面过大。');
  }

  const html = await readBoundedHtml(response);

  const result = parseBangumiPeoplePage(html, page);
  if (result.items.length === 0 && page === 1) {
    reportHtmlParseFailure({ page, parser: 'people', url });
    throw new BangumiPeopleListError(502, 'Bangumi 人物页面结构已变化。');
  }
  return result;
}
