import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import {
  getPublicCache,
  type PublicCache,
  servePublicCached,
} from '../public-cache.ts';
import {
  BangumiRankingError,
  getBangumiRankedSubjects,
} from './bangumi-client.ts';

const SUPPORTED_SUBJECT_TYPES = new Set([1, 2, 3, 4, 6]);
const MAX_OFFSET = 100_000;

export type RankingDependencies = {
  rankingCache?: PublicCache;
};

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

    const cache = getPublicCache(dependencies.rankingCache);
    const cacheUrl = new URL(context.req.url);
    cacheUrl.search = '';
    cacheUrl.searchParams.set('type', String(subjectType));
    cacheUrl.searchParams.set('offset', String(offset));
    const cacheKey = new Request(cacheUrl, { method: 'GET' });
    try {
      return await servePublicCached(context, cache, async () => {
        const page = await getBangumiRankedSubjects({
          fetcher,
          offset,
          subjectType,
        });

        context.header(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=1800',
        );
        return context.json(page);
      }, cacheKey);
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
