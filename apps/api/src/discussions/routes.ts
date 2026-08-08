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
  BangumiDiscussionError,
  createBangumiEpisodeComment,
  createBangumiGroupTopicReply,
  createBangumiReviewReply,
  createBangumiSubjectTopicReply,
} from './bangumi-client.ts';

const createReplySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  replyTo: z.number().int().positive().optional(),
  turnstileToken: z.string().min(1).max(2048),
});

function getPositiveId(value: string | undefined) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type CreateUpstreamReply = (input: {
  accessToken: string;
  content: string;
  fetcher: typeof fetch;
  replyTo?: number;
  targetId: number;
  turnstileToken: string;
}) => Promise<{ id: number }>;

export function registerDiscussionRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
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
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

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
}
