import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import { BangumiTagListError, getBangumiTags } from './bangumi-client.ts';

const SUBJECT_TYPES = new Set([1, 2, 3, 4, 6]);

export function registerTagRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/tags', async (context) => {
    const subjectType = Number(context.req.query('type'));
    const page = Number(context.req.query('page') ?? 1);

    if (
      !SUBJECT_TYPES.has(subjectType) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10_000
    ) {
      return context.json(
        { error: 'invalid_tag_query', message: '标签类型或页码无效。' },
        400,
      );
    }

    return servePublicCached(context, getPublicCache(), 300, async () => {
      try {
        const result = await getBangumiTags({ fetcher, page, subjectType });
        context.header(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=1800',
        );
        return context.json(result);
      } catch (error) {
        if (error instanceof BangumiTagListError) {
          return context.json(
            { error: 'bangumi_tags_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }
        throw error;
      }
    });
  });
}
