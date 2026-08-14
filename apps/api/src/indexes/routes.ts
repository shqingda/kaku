import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import { getAuthStore, mapBangumiAuthError } from '../auth/route-helpers.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  BangumiIndexListError,
  BangumiIndexWriteError,
  createBangumiIndex,
  deleteBangumiIndex,
  getBangumiIndexCollection,
  getBangumiIndexes,
  type IndexSort,
  setBangumiIndexCollection,
  updateBangumiIndex,
} from './bangumi-client.ts';

const INDEX_SORTS = new Set<IndexSort>(['latest', 'popular']);

const createIndexSchema = z.object({
  title: z.string().trim().min(1).max(200),
  desc: z.string().trim().max(2000).optional(),
  private: z.boolean().optional(),
});

function getPositiveId(value: string | undefined) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function registerIndexRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
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

  async function withIndexWrite(
    context: Context<{ Bindings: Env }>,
    errorKey: string,
    action: (accessToken: string) => Promise<unknown>,
  ) {
    const store = getAuthStore(context.env, dependencies.createStore);
    const authentication = await authenticateRequest(context, store, now());

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    try {
      const accessToken = await getValidBangumiAccessToken({
        env: context.env,
        fetcher,
        now: now(),
        store,
        userId: authentication.userId,
      });
      return context.json(await action(accessToken));
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiIndexWriteError) {
        if (error.status === 401) {
          await store.deleteBangumiCredential(authentication.userId);
          return context.json(
            {
              error: 'bangumi_reauthorization_required',
              message: 'Bangumi 授权已失效，请重新登录。',
            },
            409,
          );
        }

        return context.json(
          { error: errorKey, message: error.message },
          error.status === 404
            ? 404
            : error.status === 429
              ? 429
              : error.status >= 500
                ? 503
                : 502,
        );
      }

      throw error;
    }
  }

  app.post('/me/indexes', async (context) => {
    const parsedBody = createIndexSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return context.json(
        { error: 'invalid_index', message: '目录标题或说明格式不正确。' },
        400,
      );
    }

    return withIndexWrite(context, 'bangumi_index_create_failed', (accessToken) =>
      createBangumiIndex({
        accessToken,
        desc: parsedBody.data.desc ?? '',
        fetcher,
        isPrivate: parsedBody.data.private,
        title: parsedBody.data.title,
      }),
    );
  });

  app.patch('/me/indexes/:indexId', async (context) => {
    const indexId = getPositiveId(context.req.param('indexId'));
    const parsedBody = createIndexSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!indexId || !parsedBody.success) {
      return context.json(
        { error: 'invalid_index', message: '目录标题或说明格式不正确。' },
        400,
      );
    }

    return withIndexWrite(context, 'bangumi_index_update_failed', (accessToken) =>
      updateBangumiIndex({
        accessToken,
        desc: parsedBody.data.desc ?? '',
        fetcher,
        indexId,
        isPrivate: parsedBody.data.private,
        title: parsedBody.data.title,
      }),
    );
  });

  app.delete('/me/indexes/:indexId', async (context) => {
    const indexId = getPositiveId(context.req.param('indexId'));

    if (!indexId) {
      return context.json(
        { error: 'invalid_index_id', message: '目录编号格式不正确。' },
        400,
      );
    }

    return withIndexWrite(context, 'bangumi_index_delete_failed', (accessToken) =>
      deleteBangumiIndex({ accessToken, fetcher, indexId }),
    );
  });

  app.get('/me/indexes/:indexId/collection', async (context) => {
    const indexId = getPositiveId(context.req.param('indexId'));

    if (!indexId) {
      return context.json(
        { error: 'invalid_index_id', message: '目录编号格式不正确。' },
        400,
      );
    }

    return withIndexWrite(
      context,
      'bangumi_index_collection_failed',
      async (accessToken) => ({
        collected: await getBangumiIndexCollection({
          accessToken,
          fetcher,
          indexId,
        }),
      }),
    );
  });

  app.post('/me/indexes/:indexId/collect', async (context) => {
    const indexId = getPositiveId(context.req.param('indexId'));

    if (!indexId) {
      return context.json(
        { error: 'invalid_index_id', message: '目录编号格式不正确。' },
        400,
      );
    }

    return withIndexWrite(
      context,
      'bangumi_index_collect_failed',
      async (accessToken) => ({
        collected: await setBangumiIndexCollection({
          accessToken,
          fetcher,
          indexId,
          shouldCollect: true,
        }),
      }),
    );
  });

  app.delete('/me/indexes/:indexId/collect', async (context) => {
    const indexId = getPositiveId(context.req.param('indexId'));

    if (!indexId) {
      return context.json(
        { error: 'invalid_index_id', message: '目录编号格式不正确。' },
        400,
      );
    }

    return withIndexWrite(
      context,
      'bangumi_index_uncollect_failed',
      async (accessToken) => ({
        collected: await setBangumiIndexCollection({
          accessToken,
          fetcher,
          indexId,
          shouldCollect: false,
        }),
      }),
    );
  });
}
