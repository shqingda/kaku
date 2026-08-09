import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import {
  BangumiIndexListError,
  getBangumiIndexes,
  type IndexSort,
} from './bangumi-client.ts';

const INDEX_SORTS = new Set<IndexSort>(['latest', 'popular']);

export function registerIndexRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/indexes', async (context) => {
    const sort = context.req.query('sort') ?? 'latest';
    const page = Number(context.req.query('page') ?? 1);

    if (
      !INDEX_SORTS.has(sort as IndexSort) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 999
    ) {
      return context.json(
        { error: 'invalid_index_query', message: '目录排序或页码无效。' },
        400,
      );
    }

    try {
      const result = await getBangumiIndexes({
        fetcher,
        page,
        sort: sort as IndexSort,
      });
      context.header(
        'Cache-Control',
        'public, max-age=300, stale-while-revalidate=1800',
      );
      return context.json(result);
    } catch (error) {
      if (error instanceof BangumiIndexListError) {
        return context.json(
          { error: 'bangumi_indexes_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }
      throw error;
    }
  });
}
