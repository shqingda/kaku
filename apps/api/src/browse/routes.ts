import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import { BangumiBrowseError, browseBangumiSubjects } from './bangumi-client.ts';

const SUPPORTED_TYPES = new Set([1, 2, 3, 4, 6]);
const SUPPORTED_SORTS = new Set(['rank', 'trends', 'collects', 'date', 'title']);

export function registerBrowseRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/browse', async (context) => {
    const subjectType = Number(context.req.query('type'));
    const sort = context.req.query('sort') ?? 'rank';
    const page = Number(context.req.query('page') ?? 1);
    const yearValue = context.req.query('year');
    const year = yearValue ? Number(yearValue) : undefined;
    const tags = (context.req.queries('tag') ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (
      !SUPPORTED_TYPES.has(subjectType) ||
      !SUPPORTED_SORTS.has(sort) ||
      !Number.isSafeInteger(page) || page < 1 || page > 10_000 ||
      (year !== undefined && (!Number.isSafeInteger(year) || year < 1900 || year > 2100)) ||
      tags.length > 5 || tags.some((tag) => tag.length > 30)
    ) {
      return context.json({ error: 'invalid_browse_query', message: '分类筛选条件无效。' }, 400);
    }

    return servePublicCached(context, getPublicCache(), 300, async () => {
      try {
        const result = await browseBangumiSubjects({
          fetcher,
          page,
          sort,
          subjectType,
          tags,
          year,
        });
        context.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
        return context.json(result);
      } catch (error) {
        if (error instanceof BangumiBrowseError) {
          return context.json(
            { error: 'bangumi_browse_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }
        throw error;
      }
    });
  });
}
