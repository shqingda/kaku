import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import { BangumiRankingError } from '../rankings/bangumi-client.ts';
import { getBangumiChannelSubjects } from './bangumi-client.ts';

const SUPPORTED_SUBJECT_TYPES = new Set([1, 2, 3, 4, 6]);

export function registerChannelRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/channels', async (context) => {
    const subjectType = Number(context.req.query('type'));

    if (!SUPPORTED_SUBJECT_TYPES.has(subjectType)) {
      return context.json(
        { error: 'invalid_channel_type', message: '频道类型无效。' },
        400,
      );
    }

    return servePublicCached(context, getPublicCache(), 300, async () => {
      try {
        const channel = await getBangumiChannelSubjects({
          fetcher,
          subjectType,
        });
        context.header(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=1800',
        );
        return context.json(channel);
      } catch (error) {
        if (error instanceof BangumiRankingError) {
          return context.json(
            { error: 'bangumi_channel_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }

        throw error;
      }
    });
  });
}
