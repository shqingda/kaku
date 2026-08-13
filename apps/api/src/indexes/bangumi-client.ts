import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import type { PublicIndexPage } from './model.ts';

const BANGUMI_INDEX_URL = 'https://bgm.tv/index/browser';
const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';
const MAX_HTML_LENGTH = 1_000_000;

export type IndexSort = 'latest' | 'popular';

export class BangumiIndexListError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiIndexListError';
    this.status = status;
  }
}

export class BangumiIndexWriteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiIndexWriteError';
    this.status = status;
  }
}

const createdIndexSchema = z.object({ id: z.number().int().positive() });

export async function createBangumiIndex({
  accessToken,
  desc,
  fetcher = fetch,
  isPrivate,
  title,
}: {
  accessToken: string;
  desc: string;
  fetcher?: typeof fetch;
  isPrivate?: boolean;
  title: string;
}): Promise<{ id: number }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}/indexes`, {
    body: JSON.stringify({ desc, private: isPrivate, title }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new BangumiIndexWriteError(
      response.status,
      response.status === 429
        ? '创建得太频繁了，请稍后再试。'
        : response.status >= 500
          ? 'Bangumi 暂时不可用，请稍后重试。'
          : '目录没有创建成功，请稍后重试。',
    );
  }

  return createdIndexSchema.parse(await response.json());
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
  const matches = [
    ...segment.matchAll(
      /(?:更新|创建)\s*<span class="tip_j">(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})<\/span>/g,
    ),
  ];
  const match = matches.at(-1);
  if (!match) return 0;

  const [, year, month, day, hour, minute] = match.map(Number);
  return Math.floor(
    Date.UTC(year, month - 1, day, hour - 8, minute) / 1000,
  );
}

export function parseBangumiIndexPage(
  html: string,
  page: number,
): PublicIndexPage {
  const listStart = html.indexOf('class="index-list');
  const listEnd = html.indexOf('<div class="page_inner">', listStart);
  const listHtml =
    listStart >= 0
      ? html.slice(listStart, listEnd >= 0 ? listEnd : undefined)
      : '';
  const segments = listHtml.split(/<li id="item_\d+"[^>]*index-item[^>]*>/).slice(1);

  const items = segments.flatMap((segment) => {
    const titleMatch = segment.match(
      /<a href="\/index\/(\d+)" class="l">\s*<h3>\s*([\s\S]*?)\s*<\/h3>/,
    );
    const authorMatch = segment.match(
      /<a href="\/user\/([^"/]+)" class="l">([\s\S]*?)<\/a>\s*·/,
    );
    if (!titleMatch || !authorMatch) return [];

    const avatarMatch = segment.match(
      /background-image:url\(['"]?([^'")]+)['"]?\)/,
    );
    const descriptionMatch = segment.match(
      /<span class="desc">([\s\S]*?)<\/span>/,
    );
    const statsMatch = segment.match(
      /<span class="stats tip rr">([\s\S]*?)<\/span>\s*<a href="\/index\//,
    );
    const itemCount = [...(statsMatch?.[1] ?? '').matchAll(/<span class="num">(\d+)<\/span>/g)]
      .reduce((total, match) => total + Number(match[1]), 0);

    return [{
      author: decodeHtml(authorMatch[2]),
      authorAvatarUrl: secureUrl(avatarMatch?.[1]),
      authorUsername: decodeHtml(authorMatch[1]),
      description: decodeHtml(descriptionMatch?.[1] ?? ''),
      id: Number(titleMatch[1]),
      itemCount,
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

export async function getBangumiIndexes({
  fetcher = fetch,
  page,
  sort,
}: {
  fetcher?: typeof fetch;
  page: number;
  sort: IndexSort;
}) {
  const query = new URLSearchParams();
  if (sort === 'popular') query.set('orderby', 'collect');
  if (page > 1) query.set('page', String(page));
  const url = query.size > 0
    ? `${BANGUMI_INDEX_URL}?${query}`
    : BANGUMI_INDEX_URL;
  const response = await fetcher(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new BangumiIndexListError(
      response.status,
      `Bangumi 目录请求失败（${response.status}）`,
    );
  }

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_HTML_LENGTH) {
    throw new BangumiIndexListError(502, 'Bangumi 目录页面过大。');
  }

  const html = await response.text();
  if (html.length > MAX_HTML_LENGTH) {
    throw new BangumiIndexListError(502, 'Bangumi 目录页面过大。');
  }

  const result = parseBangumiIndexPage(html, page);
  if (result.items.length === 0 && page === 1) {
    throw new BangumiIndexListError(502, 'Bangumi 目录页面结构已变化。');
  }
  return result;
}
