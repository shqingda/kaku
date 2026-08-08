import { z } from 'zod';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

const createdReplySchema = z.object({ id: z.number().int().positive() });

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

export async function createBangumiSubjectTopicReply({
  accessToken,
  content,
  fetcher = fetch,
  replyTo,
  topicId,
  turnstileToken,
}: {
  accessToken: string;
  content: string;
  fetcher?: typeof fetch;
  replyTo?: number;
  topicId: number;
  turnstileToken: string;
}): Promise<{ id: number }> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/subjects/-/topics/${topicId}/replies`,
    {
      body: JSON.stringify({ content, replyTo, turnstileToken }),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Kaku/0.1 (https://github.com/shqingda/kaku)',
      },
      method: 'POST',
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code =
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : undefined;

    throw new BangumiDiscussionError(
      response.status,
      code === 'CAPTCHA_ERROR'
        ? '安全验证已过期，请重新验证后再试。'
        : response.status === 429
          ? '回复得太频繁了，请稍后再试。'
          : response.status === 404
            ? '这个话题已不存在或当前账号无法访问。'
            : response.status >= 500
              ? 'Bangumi 讨论服务暂时不可用。'
              : '回复没有发送成功，请稍后重试。',
      code,
    );
  }

  return createdReplySchema.parse(await response.json());
}
