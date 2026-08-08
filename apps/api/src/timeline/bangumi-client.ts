import { z } from 'zod';

import type { FriendTimelineItem } from './model.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  nameCN: z.string().optional(),
});

const timelineSchema = z.object({
  cat: z.number().int(),
  createdAt: z.number().int(),
  id: z.number().int().positive(),
  memo: z.object({
    blog: z.object({ title: z.string() }).optional(),
    index: z.object({ title: z.string() }).optional(),
    progress: z
      .object({
        batch: z.object({ subject: subjectSchema }).optional(),
        single: z.object({ subject: subjectSchema }).optional(),
      })
      .optional(),
    status: z
      .object({
        nickname: z
          .object({ after: z.string(), before: z.string() })
          .optional(),
        sign: z.string().optional(),
        tsukkomi: z.string().optional(),
      })
      .optional(),
    subject: z
      .array(z.object({ comment: z.string(), subject: subjectSchema }))
      .optional(),
    wiki: z.object({ subject: subjectSchema.optional() }).optional(),
  }),
  replies: z.number().int().nonnegative(),
  user: z
    .object({
      avatar: z.object({ small: z.string().optional() }),
      nickname: z.string(),
      username: z.string(),
    })
    .optional(),
});

const timelineListSchema = z.array(timelineSchema);
const createdTimelineSchema = z.object({ id: z.number().int().positive() });

export class BangumiTimelineError extends Error {
  code?: string;
  status: number;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'BangumiTimelineError';
    this.code = code;
    this.status = status;
  }
}

function subjectTitle(subject: z.infer<typeof subjectSchema>) {
  return subject.nameCN?.trim() || subject.name;
}

function describeTimeline(item: z.infer<typeof timelineSchema>) {
  const firstSubject = item.memo.subject?.[0];
  const progressSubject =
    item.memo.progress?.batch?.subject ?? item.memo.progress?.single?.subject;

  switch (item.cat) {
    case 2:
      return item.memo.wiki?.subject
        ? `编辑了条目《${subjectTitle(item.memo.wiki.subject)}》`
        : '参与了条目编辑';
    case 3:
      return firstSubject
        ? `收藏了《${subjectTitle(firstSubject.subject)}》${firstSubject.comment ? `：${firstSubject.comment}` : ''}`
        : '更新了收藏';
    case 4:
      return progressSubject
        ? `更新了《${subjectTitle(progressSubject)}》的进度`
        : '更新了观看进度';
    case 5:
      return (
        item.memo.status?.tsukkomi ??
        item.memo.status?.sign ??
        (item.memo.status?.nickname
          ? `将昵称改为 ${item.memo.status.nickname.after}`
          : '更新了状态')
      );
    case 6:
      return item.memo.blog ? `发表了日志《${item.memo.blog.title}》` : '发表了日志';
    case 7:
      return item.memo.index ? `更新了目录《${item.memo.index.title}》` : '更新了目录';
    default:
      return '更新了一条动态';
  }
}

export async function getBangumiFriendTimeline({
  accessToken,
  fetcher = fetch,
  limit = 20,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  limit?: number;
}): Promise<FriendTimelineItem[]> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/timeline?mode=friends&limit=${limit}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Kaku/0.1 (https://kaku-web.shqingda.workers.dev)',
      },
    },
  );

  if (!response.ok) {
    throw new BangumiTimelineError(
      response.status,
      response.status >= 500
        ? 'Bangumi 动态服务暂时不可用。'
        : '好友动态暂时无法读取。',
    );
  }

  return timelineListSchema.parse(await response.json()).flatMap((item) => {
    // Bangumi's private API marks `user` as optional. A deleted account should
    // hide only its event instead of making the entire timeline unavailable.
    if (!item.user) {
      return [];
    }

    const subject =
      item.memo.subject?.[0]?.subject ??
      item.memo.progress?.batch?.subject ??
      item.memo.progress?.single?.subject ??
      item.memo.wiki?.subject;

    return [
      {
        createdAt: item.createdAt,
        id: item.id,
        replies: item.replies,
        subjectId: subject?.id,
        text: describeTimeline(item),
        user: {
          avatarUrl: item.user.avatar.small || undefined,
          nickname: item.user.nickname,
          username: item.user.username,
        },
      },
    ];
  });
}

export async function createBangumiTimelineSay({
  accessToken,
  content,
  fetcher = fetch,
  turnstileToken,
}: {
  accessToken: string;
  content: string;
  fetcher?: typeof fetch;
  turnstileToken: string;
}): Promise<{ id: number }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}/timeline`, {
    body: JSON.stringify({ content, turnstileToken }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Kaku/0.1 (https://kaku-web.shqingda.workers.dev)',
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

    throw new BangumiTimelineError(
      response.status,
      code === 'CAPTCHA_ERROR'
        ? '安全验证已过期，请重新验证后再试。'
        : response.status === 429
          ? '发布得太频繁了，请稍后再试。'
          : response.status >= 500
            ? 'Bangumi 动态服务暂时不可用。'
            : '动态没有发布成功，请重新验证后再试。',
      code,
    );
  }

  return createdTimelineSchema.parse(await response.json());
}
