import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import {
  BangumiRankingError,
  getBangumiRankedSubjects,
} from './bangumi-client.ts';

const SUPPORTED_SUBJECT_TYPES = new Set([1, 2, 3, 4, 6]);
const MAX_OFFSET = 100_000;

export type RankingDependencies = {
  rankingCache?: Pick<Cache, 'match' | 'put'>;
};

function withCacheStatus(response: Response, status: 'HIT' | 'MISS') {
  const headers = new Headers(response.headers);
  headers.set('X-Kaku-Cache', status);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function registerRankingRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & RankingDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/rankings', async (context) => {
    const subjectType = Number(context.req.query('type'));
    const offset = Number(context.req.query('offset') ?? 0);

    if (
      !SUPPORTED_SUBJECT_TYPES.has(subjectType) ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > MAX_OFFSET
    ) {
      return context.json(
        {
          error: 'invalid_ranking_query',
          message: '排行榜类型或分页位置无效。',
        },
        400,
      );
    }

    const cache =
      dependencies.rankingCache ??
      (typeof caches === 'undefined' ? undefined : caches.default);
    const cacheUrl = new URL(context.req.url);
    cacheUrl.search = '';
    cacheUrl.searchParams.set('type', String(subjectType));
    cacheUrl.searchParams.set('offset', String(offset));
    const cacheKey = new Request(cacheUrl, { method: 'GET' });
    const cachedResponse = await cache?.match(cacheKey);

    if (cachedResponse) {
      return withCacheStatus(cachedResponse, 'HIT');
    }

    try {
      const page = await getBangumiRankedSubjects({
        fetcher,
        offset,
        subjectType,
      });

      context.header(
        'Cache-Control',
        'public, max-age=300, stale-while-revalidate=1800',
      );
      const response = context.json(page);

      await cache?.put(cacheKey, response.clone());
      return withCacheStatus(response, 'MISS');
    } catch (error) {
      if (error instanceof BangumiRankingError) {
        return context.json(
          { error: 'bangumi_ranking_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  });
}
