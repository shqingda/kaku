import { z } from 'zod';

import type { RankedSubjectPage } from './model.ts';

const BANGUMI_API_URL = 'https://api.bgm.tv';
const PAGE_SIZE = 30;
const EDGE_CACHE_TTL_SECONDS = 30 * 60;

const bangumiRankedSubjectPageSchema = z.object({
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

export async function getBangumiRankedSubjects({
  fetcher = fetch,
  offset,
  subjectType,
}: {
  fetcher?: typeof fetch;
  offset: number;
  subjectType: number;
}): Promise<RankedSubjectPage> {
  const url = new URL('/v0/subjects', BANGUMI_API_URL);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('sort', 'rank');
  url.searchParams.set('type', String(subjectType));

  const response = await fetcher(url, {
    cf: {
      cacheEverything: true,
      cacheTtl: EDGE_CACHE_TTL_SECONDS,
    },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Kaku/0.1 (https://github.com/shqingda/kaku)',
    },
  });

  if (!response.ok) {
    throw new BangumiRankingError(
      response.status,
      response.status >= 500
        ? 'Bangumi 排行榜服务暂时不可用，请稍后重试。'
        : 'Bangumi 暂时无法返回排行榜。',
    );
  }

  const result = bangumiRankedSubjectPageSchema.safeParse(
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
