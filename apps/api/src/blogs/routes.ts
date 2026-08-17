import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import {
  BangumiBlogListError,
  type BlogType,
  getBangumiBlogs,
} from './bangumi-client.ts';

const BLOG_TYPES = new Set<BlogType>([
  'all',
  'anime',
  'book',
  'game',
  'music',
  'real',
]);

export function registerBlogRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/blogs', async (context) => {
    const type = context.req.query('type') ?? 'all';
    const page = Number(context.req.query('page') ?? 1);

    if (
      !BLOG_TYPES.has(type as BlogType) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 999
    ) {
      return context.json(
        { error: 'invalid_blog_query', message: '日志类型或页码无效。' },
        400,
      );
    }

    return servePublicCached(context, getPublicCache(), 300, async () => {
      try {
        const result = await getBangumiBlogs({
          fetcher,
          page,
          type: type as BlogType,
        });
        context.header(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=1800',
        );
        return context.json(result);
      } catch (error) {
        if (error instanceof BangumiBlogListError) {
          return context.json(
            { error: 'bangumi_blogs_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }
        throw error;
      }
    });
  });
}
