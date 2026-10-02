import { z } from 'zod';
import type { Context, Hono } from 'hono';

import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import {
  authenticateContext,
  mapBangumiAuthError,
} from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  BangumiDiscussionError,
  createBangumiCharacterComment,
  createBangumiEpisodeComment,
  createBangumiGroupTopic,
  createBangumiGroupTopicReply,
  createBangumiPersonComment,
  createBangumiReviewReply,
  createBangumiSubjectTopic,
  createBangumiSubjectTopicReply,
} from './bangumi-client.ts';
import { getGroupName, getPositiveId } from './route-params.ts';

const createReplySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  replyTo: z.number().int().positive().optional(),
  turnstileToken: z.string().min(1).max(2048),
});

const createTopicSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  title: z.string().trim().min(1).max(120),
  turnstileToken: z.string().min(1).max(2048),
});

type CreateUpstreamReply = (input: {
  accessToken: string;
  content: string;
  fetcher: typeof fetch;
  replyTo?: number;
  targetId: number;
  turnstileToken: string;
}) => Promise<{ id: number }>;

export function registerDiscussionCreateRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies,
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  async function createReply(
    context: Context<{ Bindings: Env }>,
    targetId: number | null,
    upstream: CreateUpstreamReply,
  ) {
    const parsedBody = createReplySchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!targetId || !parsedBody.success) {
      return context.json(
        { error: 'invalid_topic_reply', message: '回复内容格式不正确。' },
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
      const reply = await upstream({
        accessToken,
        content: parsedBody.data.content,
        fetcher,
        replyTo: parsedBody.data.replyTo,
        targetId,
        turnstileToken: parsedBody.data.turnstileToken,
      });

      return context.json(reply);
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiDiscussionError) {
        if (error.status === 401 && error.code !== 'CAPTCHA_ERROR') {
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
          { error: 'bangumi_reply_failed', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  }

  app.post('/me/subject-topics/:topicId/replies', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('topicId')),
      ({ targetId, ...input }) =>
        createBangumiSubjectTopicReply({ ...input, topicId: targetId }),
    ),
  );
  app.post('/me/group-topics/:topicId/replies', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('topicId')),
      ({ targetId, ...input }) =>
        createBangumiGroupTopicReply({ ...input, topicId: targetId }),
    ),
  );
  app.post('/me/episodes/:episodeId/comments', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('episodeId')),
      ({ targetId, ...input }) =>
        createBangumiEpisodeComment({ ...input, episodeId: targetId }),
    ),
  );
  app.post('/me/reviews/:reviewId/replies', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('reviewId')),
      ({ targetId, ...input }) =>
        createBangumiReviewReply({ ...input, reviewId: targetId }),
    ),
  );

  app.post('/me/characters/:characterId/comments', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('characterId')),
      ({ targetId, ...input }) =>
        createBangumiCharacterComment({ ...input, characterId: targetId }),
    ),
  );

  app.post('/me/persons/:personId/comments', (context) =>
    createReply(
      context,
      getPositiveId(context.req.param('personId')),
      ({ targetId, ...input }) =>
        createBangumiPersonComment({ ...input, personId: targetId }),
    ),
  );

  type CreateUpstreamTopic = (input: {
    accessToken: string;
    content: string;
    fetcher: typeof fetch;
    targetId: number | string;
    title: string;
    turnstileToken: string;
  }) => Promise<{ id: number }>;

  async function createTopic(
    context: Context<{ Bindings: Env }>,
    targetId: number | string | null,
    upstream: CreateUpstreamTopic,
  ) {
    const parsedBody = createTopicSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!targetId || !parsedBody.success) {
      return context.json(
        { error: 'invalid_topic', message: '话题标题或内容格式不正确。' },
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
      const topic = await upstream({
        accessToken,
        content: parsedBody.data.content,
        fetcher,
        targetId,
        title: parsedBody.data.title,
        turnstileToken: parsedBody.data.turnstileToken,
      });

      return context.json(topic);
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiDiscussionError) {
        if (error.status === 401 && error.code !== 'CAPTCHA_ERROR') {
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
          { error: 'bangumi_topic_create_failed', message: error.message },
          error.code === 'CAPTCHA_ERROR'
            ? 400
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

  app.post('/me/subjects/:subjectId/topics', (context) =>
    createTopic(
      context,
      getPositiveId(context.req.param('subjectId')),
      ({ targetId, ...input }) =>
        createBangumiSubjectTopic({ ...input, subjectId: targetId as number }),
    ),
  );
  app.post('/me/groups/:groupName/topics', (context) =>
    createTopic(
      context,
      getGroupName(context.req.param('groupName')),
      ({ targetId, ...input }) =>
        createBangumiGroupTopic({ ...input, groupName: targetId as string }),
    ),
  );
}
