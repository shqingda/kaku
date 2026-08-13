import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

const createdReplySchema = z.object({ id: z.number().int().positive() });
const bangumiUserSchema = z.object({
  avatar: z
    .object({
      large: z.string().optional(),
      medium: z.string().optional(),
      small: z.string().optional(),
    })
    .optional(),
  id: z.number(),
  nickname: z.string(),
  username: z.string(),
});

type BangumiDiscussionReply = {
  content: string;
  createdAt: number;
  creator?: z.infer<typeof bangumiUserSchema>;
  creatorID: number;
  id: number;
  relatedID?: number;
  replies?: BangumiDiscussionReply[];
  user?: z.infer<typeof bangumiUserSchema>;
};

const bangumiDiscussionReplySchema: z.ZodType<BangumiDiscussionReply> =
  z.lazy(() =>
    z.object({
      content: z.string(),
      createdAt: z.number(),
      creator: bangumiUserSchema.optional(),
      creatorID: z.number(),
      id: z.number(),
      relatedID: z.number().optional(),
      replies: z.array(bangumiDiscussionReplySchema).optional(),
      user: bangumiUserSchema.optional(),
    }),
  );

const bangumiSubjectTopicSchema = z.object({
  createdAt: z.number(),
  creator: bangumiUserSchema.optional(),
  creatorID: z.number(),
  id: z.number(),
  parentID: z.number(),
  replies: z.array(bangumiDiscussionReplySchema),
  replyCount: z.number(),
  title: z.string(),
  updatedAt: z.number(),
});

const bangumiGroupSchema = z.object({
  accessible: z.boolean(),
  createdAt: z.number(),
  icon: z.object({
    large: z.string(),
    medium: z.string(),
    small: z.string(),
  }),
  id: z.number(),
  members: z.number(),
  name: z.string(),
  nsfw: z.boolean(),
  title: z.string(),
});

const bangumiGroupTopicSchema = bangumiSubjectTopicSchema.extend({
  group: bangumiGroupSchema,
});

const bangumiBlogSchema = z.object({
  content: z.string(),
  createdAt: z.number(),
  id: z.number(),
  replies: z.number(),
  title: z.string(),
  updatedAt: z.number(),
  user: bangumiUserSchema,
});

export class BangumiDiscussionError extends Error {
  code?: string;
  status: number;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'BangumiDiscussionError';
    this.code = code;
    this.status = status;
  }
}

function discussionError(
  response: Response,
  code?: string,
  fallbackMessage = '讨论请求没有成功，请稍后重试。',
) {
  return new BangumiDiscussionError(
    response.status,
    code === 'CAPTCHA_ERROR'
      ? '安全验证已过期，请重新验证后再试。'
      : response.status === 429
        ? '操作得太频繁了，请稍后再试。'
        : response.status === 404
          ? '这条讨论已不存在或当前账号无法访问。'
          : response.status >= 500
            ? 'Bangumi 讨论服务暂时不可用。'
            : fallbackMessage,
    code,
  );
}

async function getBangumiDiscussionJson({
  accessToken,
  fetcher,
  path,
}: {
  accessToken: string;
  fetcher: typeof fetch;
  path: string;
}) {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw discussionError(response);
  }

  return response.json();
}

export async function getBangumiSubjectTopic({
  accessToken,
  fetcher = fetch,
  topicId,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  topicId: number;
}) {
  return bangumiSubjectTopicSchema.parse(
    await getBangumiDiscussionJson({
      accessToken,
      fetcher,
      path: `/subjects/-/topics/${topicId}`,
    }),
  );
}

export async function getBangumiGroupTopic({
  accessToken,
  fetcher = fetch,
  topicId,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  topicId: number;
}) {
  return bangumiGroupTopicSchema.parse(
    await getBangumiDiscussionJson({
      accessToken,
      fetcher,
      path: `/groups/-/topics/${topicId}`,
    }),
  );
}

export async function getBangumiEpisodeComments({
  accessToken,
  episodeId,
  fetcher = fetch,
}: {
  accessToken: string;
  episodeId: number;
  fetcher?: typeof fetch;
}) {
  return z.array(bangumiDiscussionReplySchema).parse(
    await getBangumiDiscussionJson({
      accessToken,
      fetcher,
      path: `/episodes/${episodeId}/comments`,
    }),
  );
}

export async function getBangumiReview({
  accessToken,
  fetcher = fetch,
  reviewId,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  reviewId: number;
}) {
  const [blog, comments] = await Promise.all([
    getBangumiDiscussionJson({
      accessToken,
      fetcher,
      path: `/blogs/${reviewId}`,
    }),
    getBangumiDiscussionJson({
      accessToken,
      fetcher,
      path: `/blogs/${reviewId}/comments`,
    }),
  ]);

  return {
    blog: bangumiBlogSchema.parse(blog),
    comments: z.array(bangumiDiscussionReplySchema).parse(comments),
  };
}

async function createBangumiTopicReply({
  accessToken,
  content,
  fetcher = fetch,
  path,
  replyTo,
  turnstileToken,
}: {
  accessToken: string;
  content: string;
  fetcher?: typeof fetch;
  path: string;
  replyTo?: number;
  turnstileToken: string;
}): Promise<{ id: number }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}${path}`, {
    body: JSON.stringify({ content, replyTo, turnstileToken }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    method: 'POST',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code =
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : undefined;

    throw discussionError(
      response,
      code,
      '回复没有发送成功，请稍后重试。',
    );
  }

  return createdReplySchema.parse(await response.json());
}

export function createBangumiSubjectTopicReply({
  topicId,
  ...input
}: Omit<Parameters<typeof createBangumiTopicReply>[0], 'path'> & {
  topicId: number;
}) {
  return createBangumiTopicReply({
    ...input,
    path: `/subjects/-/topics/${topicId}/replies`,
  });
}

export function createBangumiGroupTopicReply({
  topicId,
  ...input
}: Omit<Parameters<typeof createBangumiTopicReply>[0], 'path'> & {
  topicId: number;
}) {
  return createBangumiTopicReply({
    ...input,
    path: `/groups/-/topics/${topicId}/replies`,
  });
}

export function createBangumiEpisodeComment({
  episodeId,
  ...input
}: Omit<Parameters<typeof createBangumiTopicReply>[0], 'path'> & {
  episodeId: number;
}) {
  return createBangumiTopicReply({
    ...input,
    path: `/episodes/${episodeId}/comments`,
  });
}

export function createBangumiReviewReply({
  reviewId,
  ...input
}: Omit<Parameters<typeof createBangumiTopicReply>[0], 'path'> & {
  reviewId: number;
}) {
  return createBangumiTopicReply({
    ...input,
    path: `/blogs/${reviewId}/comments`,
  });
}

async function createBangumiTopic({
  accessToken,
  content,
  fetcher = fetch,
  path,
  title,
  turnstileToken,
}: {
  accessToken: string;
  content: string;
  fetcher?: typeof fetch;
  path: string;
  title: string;
  turnstileToken: string;
}): Promise<{ id: number }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}${path}`, {
    body: JSON.stringify({ content, title, turnstileToken }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    method: 'POST',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code =
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : undefined;

    throw discussionError(
      response,
      code,
      '话题没有创建成功，请稍后重试。',
    );
  }

  return createdReplySchema.parse(await response.json());
}

export function createBangumiSubjectTopic({
  subjectId,
  ...input
}: Omit<Parameters<typeof createBangumiTopic>[0], 'path'> & {
  subjectId: number;
}) {
  return createBangumiTopic({
    ...input,
    path: `/subjects/${subjectId}/topics`,
  });
}

export function createBangumiGroupTopic({
  groupName,
  ...input
}: Omit<Parameters<typeof createBangumiTopic>[0], 'path'> & {
  groupName: string;
}) {
  return createBangumiTopic({
    ...input,
    path: `/groups/${encodeURIComponent(groupName)}/topics`,
  });
}
