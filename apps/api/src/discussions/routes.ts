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
  BangumiDiscussionError,
  createBangumiCharacterComment,
  createBangumiEpisodeComment,
  createBangumiGroupTopic,
  createBangumiGroupTopicReply,
  createBangumiPersonComment,
  createBangumiReviewReply,
  createBangumiSubjectTopic,
  createBangumiSubjectTopicReply,
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
  getBangumiEpisodeComments,
  getBangumiGroupTopic,
  getBangumiReview,
  getBangumiSubjectTopic,
} from './bangumi-client.ts';

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

const GROUP_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function getGroupName(value: string | undefined) {
  return value && GROUP_NAME_PATTERN.test(value) ? value : null;
}

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

type ReadUpstreamDiscussion = (input: {
  accessToken: string;
  fetcher: typeof fetch;
  targetId: number;
}) => Promise<unknown>;

export function registerDiscussionRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
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
