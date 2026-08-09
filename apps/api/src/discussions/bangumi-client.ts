import { z } from 'zod';

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

export async function getBangumiSubjectTopic({
  accessToken,
  fetcher = fetch,
  topicId,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  topicId: number;
}) {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/subjects/-/topics/${topicId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Kaku/0.1 (https://github.com/shqingda/kaku)',
      },
    },
  );

  if (!response.ok) {
    throw discussionError(response);
  }

  return bangumiSubjectTopicSchema.parse(await response.json());
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
      'User-Agent': 'Kaku/0.1 (https://github.com/shqingda/kaku)',
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
