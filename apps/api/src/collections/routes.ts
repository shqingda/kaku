import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { BangumiOAuthError } from '../auth/bangumi-client.ts';
import {
  BangumiReauthorizationRequiredError,
  getValidBangumiAccessToken,
} from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../auth/session-service.ts';
import { createD1AuthStore } from '../auth/store.ts';
import type { Env } from '../env.ts';
import {
  BangumiApiError,
  getBangumiEntityCollection,
  getBangumiPersonalCollection,
  saveBangumiPersonalCollection,
  setBangumiEntityCollection,
} from './bangumi-client.ts';

const collectionUpdateSchema = z.object({
  collectionStatus: z
    .enum(['wish', 'completed', 'doing', 'onHold', 'dropped'])
    .nullable(),
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

    const store = dependencies.createStore
      ? dependencies.createStore(context.env.DB)
      : createD1AuthStore(context.env.DB);
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
      const collected = await action({
        accessToken,
        entityId,
        kind: parsedKind.data,
        username: authentication.user.username,
      });
      return context.json({ collected });
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

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

      if (error instanceof BangumiOAuthError) {
        return context.json(
          {
            error: 'bangumi_oauth_unavailable',
            message: 'Bangumi 登录服务暂时不可用，请稍后重试。',
          },
          503,
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

  app.get('/me/collections/:subjectId', async (context) => {
    const subjectId = getSubjectId(context.req.param('subjectId'));

    if (!subjectId) {
      return context.json(
        { error: 'invalid_subject_id', message: '条目 ID 不正确。' },
        400,
      );
    }

    const store = dependencies.createStore
      ? dependencies.createStore(context.env.DB)
      : createD1AuthStore(context.env.DB);
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
      const collection = await getBangumiPersonalCollection({
        accessToken,
        fetcher,
        subjectId,
        username: authentication.user.username,
      });

      return context.json({ collection });
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

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

      if (error instanceof BangumiOAuthError) {
        return context.json(
          {
            error: 'bangumi_oauth_unavailable',
            message: 'Bangumi 登录服务暂时不可用，请稍后重试。',
          },
          503,
        );
      }

      throw error;
    }
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

    if (parsedBody.data.collectionStatus === null) {
      return context.json(
        {
          error: 'collection_removal_unsupported',
          message: 'Bangumi 官方 API 暂不支持取消条目收藏。',
        },
        409,
      );
    }

    const store = dependencies.createStore
      ? dependencies.createStore(context.env.DB)
      : createD1AuthStore(context.env.DB);
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

      await saveBangumiPersonalCollection({
        accessToken,
        collectionStatus: parsedBody.data.collectionStatus,
        comment: parsedBody.data.comment,
        fetcher,
        isPrivate: parsedBody.data.isPrivate,
        readChapterCount: parsedBody.data.readChapterCount,
        readVolumeCount: parsedBody.data.readVolumeCount,
        rating: parsedBody.data.rating,
        subjectId,
        tags: parsedBody.data.tags,
        watchedEpisodeNumbers: parsedBody.data.watchedEpisodeNumbers,
      });

      const collection = await getBangumiPersonalCollection({
        accessToken,
        fetcher,
        subjectId,
        username: authentication.user.username,
      });

      return context.json({ collection });
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

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

      if (error instanceof BangumiOAuthError) {
        return context.json(
          {
            error: 'bangumi_oauth_unavailable',
            message: 'Bangumi 登录服务暂时不可用，请稍后重试。',
          },
          503,
        );
      }

      throw error;
    }
  });
}
