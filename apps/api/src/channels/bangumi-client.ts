import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import { getBangumiRankedSubjects } from '../rankings/bangumi-client.ts';
import type { ChannelSubjectList } from './model.ts';

const BANGUMI_NEXT_URL = 'https://next.bgm.tv';
const EDGE_CACHE_TTL_SECONDS = 30 * 60;

const trendingPageSchema = z.object({
  data: z.array(
    z.object({
      count: z.number().int().nonnegative(),
      subject: z.object({
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
    }),
  ),
});

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

export async function getBangumiChannelSubjects({
  fetcher = fetch,
  subjectType,
}: {
  fetcher?: typeof fetch;
  subjectType: number;
}): Promise<ChannelSubjectList> {
  const url = new URL('/p1/trending/subjects', BANGUMI_NEXT_URL);
  url.searchParams.set('type', String(subjectType));
  url.searchParams.set('limit', '12');

  const response = await fetcher(url, {
    cf: { cacheEverything: true, cacheTtl: EDGE_CACHE_TTL_SECONDS },
    headers: {
      Accept: 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
  } as RequestInit).catch(() => undefined);
  const result = response?.ok
    ? trendingPageSchema.safeParse(await response.json().catch(() => null))
    : undefined;

  if (result?.success && result.data.data.length > 0) {
    return {
      items: result.data.data.map(({ count, subject }) => ({
        attentionCount: count,
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
    };
  }

  console.warn('Bangumi trending subjects unavailable; using ranked fallback.');
  const fallback = await getBangumiRankedSubjects({
    fetcher,
    offset: 0,
    subjectType,
  });

  return {
    items: fallback.items.slice(0, 12),
  };
}
