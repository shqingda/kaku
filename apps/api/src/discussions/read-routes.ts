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
  getBangumiEpisodeComments,
  getBangumiGroupTopic,
  getBangumiReview,
  getBangumiSubjectTopic,
} from './bangumi-client.ts';
import { getPositiveId } from './route-params.ts';

type ReadUpstreamDiscussion = (input: {
  accessToken: string;
  fetcher: typeof fetch;
  targetId: number;
}) => Promise<unknown>;

export function registerDiscussionReadRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies,
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  async function readDiscussion(
    context: Context<{ Bindings: Env }>,
    targetId: number | null,
    upstream: ReadUpstreamDiscussion,
  ) {
    if (!targetId) {
      return context.json(
        { error: 'invalid_topic_id', message: '话题编号格式不正确。' },
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

      return context.json(
        await upstream({ accessToken, fetcher, targetId }),
      );
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiDiscussionError) {
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
          { error: 'bangumi_topic_unavailable', message: error.message },
          error.status === 404 ? 404 : error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  }

  app.get('/me/subject-topics/:topicId', (context) =>
    readDiscussion(
      context,
      getPositiveId(context.req.param('topicId')),
      ({ targetId, ...input }) =>
        getBangumiSubjectTopic({ ...input, topicId: targetId }),
    ),
  );
  app.get('/me/group-topics/:topicId', (context) =>
    readDiscussion(
      context,
      getPositiveId(context.req.param('topicId')),
      ({ targetId, ...input }) =>
        getBangumiGroupTopic({ ...input, topicId: targetId }),
    ),
  );
  app.get('/me/episodes/:episodeId/comments', (context) =>
    readDiscussion(
      context,
      getPositiveId(context.req.param('episodeId')),
      ({ targetId, ...input }) =>
        getBangumiEpisodeComments({ ...input, episodeId: targetId }),
    ),
  );
  app.get('/me/reviews/:reviewId', (context) =>
    readDiscussion(
      context,
      getPositiveId(context.req.param('reviewId')),
      ({ targetId, ...input }) =>
        getBangumiReview({ ...input, reviewId: targetId }),
    ),
  );
}
