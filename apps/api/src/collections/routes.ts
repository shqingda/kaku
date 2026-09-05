import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import {
  authenticateContext,
  mapBangumiAuthError,
} from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  BangumiApiError,
  getBangumiEntityCollection,
  getBangumiPersonalCollection,
  getBangumiPersonalCollectionPage,
  saveBangumiPersonalCollection,
  setBangumiEntityCollection,
} from './bangumi-client.ts';

const collectionUpdateSchema = z.object({
  collectionStatus: z
    .enum(['wish', 'completed', 'doing', 'onHold', 'dropped'])
    .nullable()
    .optional(),
  comment: z.string().max(1000).optional(),
  isPrivate: z.boolean().optional(),
  readChapterCount: z.number().int().nonnegative().optional(),
  readVolumeCount: z.number().int().nonnegative().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string().min(1).regex(/^\S+$/)).optional(),
  watchedEpisodeNumbers: z
    .array(z.number().int().positive())
    .max(5000)
    .optional(),
});

const entityCollectionUpdateSchema = z.object({ collected: z.boolean() });
const entityKindSchema = z.enum(['character', 'person']);
const collectionListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  status: z
    .enum(['wish', 'completed', 'doing', 'onHold', 'dropped'])
    .optional(),
  subjectType: z.coerce
    .number()
    .int()
    .refine((value) => [1, 2, 3, 4, 6].includes(value))
    .optional(),
});

function getSubjectId(value: string) {
  const subjectId = Number(value);
  return Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null;
}

function getEntityId(value: string | undefined) {
  const entityId = Number(value);
  return Number.isSafeInteger(entityId) && entityId > 0 ? entityId : null;
}

export function registerCollectionRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  async function withEntityCollection(
    context: Context<{ Bindings: Env }>,
    action: (input: {
      accessToken: string;
      entityId: number;
      kind: 'character' | 'person';
      username: string;
    }) => Promise<boolean>,
  ) {
    const entityId = getEntityId(context.req.param('entityId'));
    const parsedKind = entityKindSchema.safeParse(context.req.param('kind'));

    if (!entityId || !parsedKind.success) {
      return context.json(
        { error: 'invalid_entity', message: '角色或人物编号不正确。' },
        400,
      );
    }

    const { authentication, store } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );

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
      const collected = await action({
        accessToken,
        entityId,
        kind: parsedKind.data,
        username: authentication.user.username,
      });
      return context.json({ collected });
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiApiError) {
        console.error('Bangumi entity collection request failed', {
          entityId,
          kind: parsedKind.data,
          status: error.status,
          upstreamBody: error.upstreamBody,
          upstreamRequestId: error.upstreamRequestId,
        });

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
          { error: 'bangumi_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  }

  app.get('/me/entities/:kind/:entityId/collection', (context) =>
    withEntityCollection(context, ({ accessToken, entityId, kind, username }) =>
      getBangumiEntityCollection({
        accessToken,
        entityId,
        fetcher,
        kind,
        username,
      }),
    ),
  );

  app.put('/me/entities/:kind/:entityId/collection', async (context) => {
    const body = entityCollectionUpdateSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!body.success) {
      return context.json(
        { error: 'invalid_entity_collection', message: '收藏状态不正确。' },
        400,
      );
    }

    return withEntityCollection(
      context,
      async ({ accessToken, entityId, kind }) => {
        await setBangumiEntityCollection({
          accessToken,
          collected: body.data.collected,
          entityId,
          fetcher,
          kind,
        });
        return body.data.collected;
      },
    );
  });

  async function withPersonalCollection(
    context: Context<{ Bindings: Env }>,
    action: (input: {
      accessToken: string;
      username: string;
    }) => Promise<unknown>,
  ) {
    const { authentication, store } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );

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
      return context.json(
        await action({
          accessToken,
          username: authentication.user.username,
        }),
      );
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiApiError) {
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
          { error: 'bangumi_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      if (error instanceof z.ZodError) {
        return context.json(
          { error: 'invalid_upstream_data', message: '收藏数据格式异常，请重试' },
          502,
        );
      }

      throw error;
    }
  }

  app.get('/me/collections', async (context) => {
    context.header('Cache-Control', 'private, no-store');
    const query = collectionListQuerySchema.safeParse({
      offset: context.req.query('offset') ?? 0,
      status: context.req.query('status') || undefined,
      subjectType: context.req.query('subjectType') || undefined,
    });

    if (!query.success) {
      return context.json(
        { error: 'invalid_collection_query', message: '分页或筛选条件不正确' },
        400,
      );
    }

    return withPersonalCollection(context, ({ accessToken, username }) =>
      getBangumiPersonalCollectionPage({
        accessToken,
        collectionStatus: query.data.status,
        fetcher,
        offset: query.data.offset,
        subjectType: query.data.subjectType,
        username,
      }),
    );
  });

  app.get('/me/collections/:subjectId', async (context) => {
    const subjectId = getSubjectId(context.req.param('subjectId'));

    if (!subjectId) {
      return context.json(
        { error: 'invalid_subject_id', message: '条目 ID 不正确。' },
        400,
      );
    }

    return withPersonalCollection(context, async ({ accessToken, username }) => {
      const collection = await getBangumiPersonalCollection({
        accessToken,
        fetcher,
        subjectId,
        username,
      });
      return { collection };
    });
  });

  app.put('/me/collections/:subjectId', async (context) => {
    const subjectId = getSubjectId(context.req.param('subjectId'));
    const parsedBody = collectionUpdateSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!subjectId || !parsedBody.success) {
      return context.json(
        { error: 'invalid_collection', message: '收藏内容格式不正确。' },
        400,
      );
    }

    const update = parsedBody.data;
    if (update.collectionStatus === null) {
      return context.json(
        {
          error: 'collection_removal_unsupported',
          message: 'Bangumi 官方 API 暂不支持取消条目收藏。',
        },
        409,
      );
    }

    return withPersonalCollection(context, async ({ accessToken, username }) => {
      await saveBangumiPersonalCollection({
        accessToken,
        collectionStatus: update.collectionStatus ?? undefined,
        comment: update.comment,
        fetcher,
        isPrivate: update.isPrivate,
        readChapterCount: update.readChapterCount,
        readVolumeCount: update.readVolumeCount,
        rating: update.rating,
        subjectId,
        tags: update.tags,
        watchedEpisodeNumbers: update.watchedEpisodeNumbers,
      });

      const collection = await getBangumiPersonalCollection({
        accessToken,
        fetcher,
        subjectId,
        username,
      });

      return { collection };
    });
  });
}
