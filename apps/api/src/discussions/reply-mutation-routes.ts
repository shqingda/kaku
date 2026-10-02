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
  deleteBangumiBlogComment,
  deleteBangumiCharacterComment,
  deleteBangumiEpisodeComment,
  deleteBangumiGroupPost,
  deleteBangumiPersonComment,
  deleteBangumiSubjectPost,
  editBangumiBlogComment,
  editBangumiCharacterComment,
  editBangumiEpisodeComment,
  editBangumiGroupPost,
  editBangumiPersonComment,
  editBangumiSubjectPost,
} from './bangumi-client.ts';
import { getPositiveId } from './route-params.ts';

export function registerReplyMutationRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies,
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  type DeleteUpstreamPost = (input: {
    accessToken: string;
    fetcher: typeof fetch;
    postId: number;
  }) => Promise<void>;

  async function deletePost(
    context: Context<{ Bindings: Env }>,
    postId: number | null,
    upstream: DeleteUpstreamPost,
  ) {
    if (!postId) {
      return context.json(
        { error: 'invalid_post_id', message: '回复编号格式不正确。' },
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
      await upstream({ accessToken, fetcher, postId });

      return context.json({ deleted: true });
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
          { error: 'bangumi_reply_delete_failed', message: error.message },
          error.status === 404
            ? 404
            : error.status >= 500
              ? 503
              : 502,
        );
      }

      throw error;
    }
  }

  app.delete('/me/subject-posts/:postId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('postId')),
      ({ postId, ...input }) =>
        deleteBangumiSubjectPost({ ...input, postId }),
    ),
  );
  app.delete('/me/group-posts/:postId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('postId')),
      ({ postId, ...input }) => deleteBangumiGroupPost({ ...input, postId }),
    ),
  );

  const updatePostSchema = z.object({
    content: z.string().trim().min(1).max(5000),
  });

  type UpdateUpstreamPost = (input: {
    accessToken: string;
    content: string;
    fetcher: typeof fetch;
    postId: number;
  }) => Promise<void>;

  async function updatePost(
    context: Context<{ Bindings: Env }>,
    postId: number | null,
    upstream: UpdateUpstreamPost,
  ) {
    const parsedBody = updatePostSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!postId || !parsedBody.success) {
      return context.json(
        { error: 'invalid_post', message: '回复内容格式不正确。' },
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
      await upstream({
        accessToken,
        content: parsedBody.data.content,
        fetcher,
        postId,
      });

      return context.json({ updated: true });
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
          { error: 'bangumi_reply_edit_failed', message: error.message },
          error.status === 404
            ? 404
            : error.status >= 500
              ? 503
              : 502,
        );
      }

      throw error;
    }
  }

  app.put('/me/subject-posts/:postId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('postId')),
      ({ postId, ...input }) =>
        editBangumiSubjectPost({ ...input, postId }),
    ),
  );
  app.put('/me/group-posts/:postId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('postId')),
      ({ postId, ...input }) => editBangumiGroupPost({ ...input, postId }),
    ),
  );

  app.put('/me/episode-comments/:commentId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        editBangumiEpisodeComment({ ...input, commentId: postId }),
    ),
  );

  app.put('/me/blog-comments/:commentId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        editBangumiBlogComment({ ...input, commentId: postId }),
    ),
  );

  app.put('/me/character-comments/:commentId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        editBangumiCharacterComment({ ...input, commentId: postId }),
    ),
  );

  app.put('/me/person-comments/:commentId', (context) =>
    updatePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        editBangumiPersonComment({ ...input, commentId: postId }),
    ),
  );

  app.delete('/me/character-comments/:commentId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        deleteBangumiCharacterComment({ ...input, commentId: postId }),
    ),
  );

  app.delete('/me/person-comments/:commentId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        deleteBangumiPersonComment({ ...input, commentId: postId }),
    ),
  );

  app.delete('/me/episode-comments/:commentId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        deleteBangumiEpisodeComment({ ...input, commentId: postId }),
    ),
  );

  app.delete('/me/blog-comments/:commentId', (context) =>
    deletePost(
      context,
      getPositiveId(context.req.param('commentId')),
      ({ postId, ...input }) =>
        deleteBangumiBlogComment({ ...input, commentId: postId }),
    ),
  );
}
