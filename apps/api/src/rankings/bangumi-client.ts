import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import type { RankedSubjectPage } from './model.ts';

const BANGUMI_API_URL = 'https://api.bgm.tv';
const BANGUMI_NEXT_URL = 'https://next.bgm.tv';
const P1_PAGE_SIZE = 24;
// Keep both upstreams on the same cursor cadence so a temporary P1 failure
// cannot make the next recovered page skip or repeat ranked subjects.
const V0_PAGE_SIZE = P1_PAGE_SIZE;
const EDGE_CACHE_TTL_SECONDS = 30 * 60;

const bangumiP1RankedSubjectPageSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int().positive(),
      images: z
        .object({
          common: z.string().optional(),
          medium: z.string().optional(),
          small: z.string().optional(),
        })
        .nullish(),
      name: z.string(),
      nameCN: z.string(),
      rating: z.object({ score: z.number() }).nullish(),
      type: z.number().int(),
    }),
  ),
  total: z.number().int().nonnegative(),
});

const bangumiV0RankedSubjectPageSchema = z.object({
  data: z.array(
    z.object({
      date: z.string().nullish(),
      id: z.number().int().positive(),
      images: z
        .object({
          common: z.string().optional(),
          medium: z.string().optional(),
          small: z.string().optional(),
        })
        .nullish(),
      name: z.string(),
      name_cn: z.string(),
      rating: z.object({ score: z.number() }).nullish(),
      type: z.number().int(),
    }),
  ),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export class BangumiRankingError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiRankingError';
    this.status = status;
  }
}

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

function createRequestInit(): RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } } {
  return {
    cf: {
      cacheEverything: true,
      cacheTtl: EDGE_CACHE_TTL_SECONDS,
    },
    headers: {
      Accept: 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
  };
}

async function getP1RankedSubjects({
  fetcher,
  offset,
  subjectType,
}: {
  fetcher: typeof fetch;
  offset: number;
  subjectType: number;
}): Promise<RankedSubjectPage | undefined> {
  const page = Math.floor(offset / P1_PAGE_SIZE) + 1;
  const url = new URL('/p1/subjects', BANGUMI_NEXT_URL);
  url.searchParams.set('type', String(subjectType));
  url.searchParams.set('sort', 'rank');
  url.searchParams.set('page', String(page));

  const response = await fetcher(url, createRequestInit()).catch((error) => {
    console.warn('Bangumi P1 ranking request failed; falling back to v0.', error);
    return undefined;
  });
  if (!response?.ok) {
    if (response) {
      console.warn(
        `Bangumi P1 ranking returned ${response.status}; falling back to v0.`,
      );
    }
    return undefined;
  }

  const result = bangumiP1RankedSubjectPageSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!result.success) {
    console.warn(
      'Bangumi P1 ranking response was not recognized; falling back to v0.',
      result.error.issues,
    );
    return undefined;
  }

  const nextOffset = page * P1_PAGE_SIZE;

  return {
    items: result.data.data.map((subject) => ({
      coverUrl: secureImage(
        subject.images?.common ??
          subject.images?.medium ??
          subject.images?.small,
      ),
      id: subject.id,
      score: subject.rating?.score,
      title: subject.nameCN.trim() || subject.name,
      type: subject.type,
    })),
    nextOffset:
      result.data.data.length > 0 && page < result.data.total
        ? nextOffset
        : undefined,
  };
}

async function getV0RankedSubjects({
  fetcher,
  offset,
  subjectType,
}: {
  fetcher: typeof fetch;
  offset: number;
  subjectType: number;
}): Promise<RankedSubjectPage> {
  const url = new URL('/v0/subjects', BANGUMI_API_URL);
  url.searchParams.set('limit', String(V0_PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('sort', 'rank');
  url.searchParams.set('type', String(subjectType));

  const response = await fetcher(url, createRequestInit());

  if (!response.ok) {
    throw new BangumiRankingError(
      response.status,
      response.status >= 500
        ? 'Bangumi 排行榜服务暂时不可用，请稍后重试。'
        : 'Bangumi 暂时无法返回排行榜。',
    );
  }

  const result = bangumiV0RankedSubjectPageSchema.safeParse(
    await response.json().catch(() => null),
  );

  if (!result.success) {
    throw new BangumiRankingError(
      502,
      'Bangumi 返回了无法识别的排行榜数据。',
    );
  }

  const nextOffset = result.data.offset + result.data.data.length;

  return {
    items: result.data.data.map((subject) => ({
      coverUrl: secureImage(
        subject.images?.common ??
          subject.images?.medium ??
          subject.images?.small,
      ),
      date: subject.date ?? undefined,
      id: subject.id,
      score: subject.rating?.score,
      title: subject.name_cn.trim() || subject.name,
      type: subject.type,
    })),
    nextOffset:
      nextOffset > result.data.offset && nextOffset < result.data.total
        ? nextOffset
        : undefined,
    total: result.data.total,
  };
}

export async function getBangumiRankedSubjects({
  fetcher = fetch,
  offset,
  subjectType,
}: {
  fetcher?: typeof fetch;
  offset: number;
  subjectType: number;
}): Promise<RankedSubjectPage> {
  return (
    (await getP1RankedSubjects({ fetcher, offset, subjectType })) ??
    getV0RankedSubjects({ fetcher, offset, subjectType })
  );
}
