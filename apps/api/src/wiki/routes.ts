import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import { BangumiWikiFeedError, getBangumiWikiFeed } from './bangumi-client.ts';

export function registerWikiRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/wiki/revisions', async (context) => {
    return servePublicCached(context, getPublicCache(), 120, async () => {
      try {
        const result = await getBangumiWikiFeed({ fetcher });
        context.header(
          'Cache-Control',
          'public, max-age=120, stale-while-revalidate=600',
        );
        return context.json(result);
      } catch (error) {
        if (error instanceof BangumiWikiFeedError) {
          return context.json(
            { error: 'bangumi_wiki_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }
        throw error;
      }
    });
  });
}
