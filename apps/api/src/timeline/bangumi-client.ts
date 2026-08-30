import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import type { FriendTimelineItem, FriendTimelinePage } from './model.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  nameCN: z.string().optional(),
  type: z.number().int().default(0),
});

const timelineUserSchema = z.object({
  avatar: z.object({ small: z.string().optional() }).optional(),
  id: z.number().int().positive().optional(),
  nickname: z.string(),
  username: z.string(),
});

const timelineEntitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  nameCN: z.string().optional(),
});

const timelineSchema = z.object({
  batch: z.boolean().default(false),
  cat: z.number().int(),
  createdAt: z.number().int(),
  id: z.number().int().positive(),
  memo: z.object({
    blog: z.object({ id: z.number().int().positive(), title: z.string() }).optional(),
    daily: z
      .object({ users: z.array(timelineUserSchema).optional() })
      .optional(),
    index: z.object({ title: z.string() }).optional(),
    mono: z
      .object({
        characters: z.array(timelineEntitySchema).default([]),
        persons: z.array(timelineEntitySchema).default([]),
      })
      .optional(),
    progress: z
      .object({
        batch: z
          .object({
            epsTotal: z.string(),
            epsUpdate: z.number().int().optional(),
            subject: subjectSchema,
            volsTotal: z.string(),
            volsUpdate: z.number().int().optional(),
          })
          .optional(),
        single: z
          .object({
            episode: z.object({ sort: z.number() }),
            subject: subjectSchema,
          })
          .optional(),
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
  type: z.number().int().default(0),
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

const collectionVerbs: Record<number, string> = {
  1: '想读',
  2: '想看',
  3: '想听',
  4: '想玩',
  5: '读过',
  6: '看过',
  7: '听过',
  8: '玩过',
  9: '在读',
  10: '在看',
  11: '在听',
  12: '在玩',
  13: '搁置了',
  14: '抛弃了',
};

type TimelineDescription = {
  blogId?: number;
  blogTitle?: string;
  entityId?: number;
  entityKind?: 'character' | 'person';
  entityTitle?: string;
  leadingText?: string;
  subjectTitle?: string;
  text: string;
  trailingText?: string;
  userMentions?: { nickname: string; username: string }[];
};

function subjectDescription({
  leadingText,
  subject,
  trailingText = '',
}: {
  leadingText: string;
  subject: z.infer<typeof subjectSchema>;
  trailingText?: string;
}): TimelineDescription {
  const title = subjectTitle(subject);
  return {
    leadingText,
    subjectTitle: title,
    text: `${leadingText}《${title}》${trailingText}`,
    trailingText,
  };
}

function describeTimeline(item: z.infer<typeof timelineSchema>) {
  const firstSubject = item.memo.subject?.[0];
  const progressBatch = item.memo.progress?.batch;
  const progressSingle = item.memo.progress?.single;

  switch (item.cat) {
    case 1:
      if (item.type === 2 && item.memo.daily?.users?.length) {
        const users = item.memo.daily.users;
        return {
          leadingText: '将 ',
          text: `将 ${users.map((user) => user.nickname || user.username).join('、')} 加为了好友`,
          trailingText: ' 加为了好友',
          userMentions: users.map((user) => ({
            nickname: user.nickname || user.username,
            username: user.username,
          })),
        };
      }
      return {
        text:
          item.type === 1
            ? '加入了 Bangumi'
            : item.type === 2
              ? '添加了好友'
              : item.type === 3
                ? '加入了小组'
                : item.type === 4
                  ? '创建了小组'
                  : item.type === 5
                    ? '加入了乐园'
                    : '完成了一项日常活动',
      };
    case 2:
      return item.memo.wiki?.subject
        ? subjectDescription({
            leadingText: '编辑了条目 ',
            subject: item.memo.wiki.subject,
          })
        : { text: '参与了条目编辑' };
    case 3:
      if (!firstSubject) {
        return { text: '更新了收藏' };
      }
      return subjectDescription({
        leadingText: `${item.batch ? '收藏了' : (collectionVerbs[item.type] ?? '收藏了')} `,
        subject: firstSubject.subject,
        trailingText: firstSubject.comment ? `：${firstSubject.comment}` : '',
      });
    case 4: {
      if (progressBatch) {
        const progress =
          progressBatch.epsUpdate !== undefined
            ? `${progressBatch.epsUpdate} of ${progressBatch.epsTotal} 话`
            : progressBatch.volsUpdate !== undefined
              ? `${progressBatch.volsUpdate} of ${progressBatch.volsTotal} 卷`
              : '';
        return subjectDescription({
          leadingText: '完成了 ',
          subject: progressBatch.subject,
          trailingText: progress ? ` ${progress}` : '',
        });
      }
      if (progressSingle) {
        const verb = item.type === 1 ? '想看' : item.type === 2 ? '看过' : '抛弃了';
        return subjectDescription({
          leadingText: `${verb} `,
          subject: progressSingle.subject,
          trailingText: ` 第 ${progressSingle.episode.sort} 话`,
        });
      }
      return { text: '更新了观看进度' };
    }
    case 5:
      return {
        text:
          item.memo.status?.tsukkomi ??
          item.memo.status?.sign ??
          (item.memo.status?.nickname
            ? `将昵称改为 ${item.memo.status.nickname.after}`
            : '更新了状态'),
      };
    case 6: {
      const blog = item.memo.blog;
      if (!blog) {
        return { text: '发表了日志' };
      }
      const leading = '发表了日志 ';
      return {
        blogId: blog.id,
        blogTitle: blog.title,
        leadingText: leading,
        text: `${leading}《${blog.title}》`,
        trailingText: '',
      };
    }
    case 7:
      return { text: item.memo.index ? `更新了目录《${item.memo.index.title}》` : '更新了目录' };
    case 8: {
      const character = item.memo.mono?.characters[0];
      const person = item.memo.mono?.persons[0];
      const entity = character ?? person;
      if (!entity) return { text: '更新了人物收藏' };
      const title = entity.nameCN?.trim() || entity.name;
      const kind: 'character' | 'person' = character ? 'character' : 'person';
      const leading = `${item.type === 1 ? '收藏了' : '创建了'}${character ? '角色' : '人物'} `;
      return {
        leadingText: leading,
        entityId: entity.id,
        entityKind: kind,
        entityTitle: title,
        text: `${leading}${title}`,
      };
    }
    default:
      return { text: '更新了一条动态' };
  }
}

export async function getBangumiFriendTimeline({
  accessToken,
  fetcher = fetch,
  limit = 20,
  until,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  limit?: number;
  until?: number;
}): Promise<FriendTimelinePage> {
  const url = new URL(`${BANGUMI_PRIVATE_API_URL}/timeline`);
  url.searchParams.set('mode', 'friends');
  url.searchParams.set('limit', String(limit));
  if (until !== undefined) {
    url.searchParams.set('until', String(until));
  }

  const response = await fetcher(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new BangumiTimelineError(
      response.status,
      response.status >= 500
        ? 'Bangumi 动态服务暂时不可用。'
        : '好友动态暂时无法读取。',
    );
  }

  const rawItems = timelineListSchema.parse(await response.json());
  const items: FriendTimelineItem[] = rawItems.flatMap((item) => {
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
    const description = describeTimeline(item);

    return [
      {
        createdAt: item.createdAt,
        ...description,
        id: item.id,
        replies: item.replies,
        subjectId: subject?.id,
        user: {
          avatarUrl: item.user.avatar.small || undefined,
          nickname: item.user.nickname,
          username: item.user.username,
        },
      },
    ];
  });

  return {
    items,
    nextUntil:
      rawItems.length === limit ? rawItems.at(-1)?.id : undefined,
  };
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

export async function deleteBangumiTimeline({
  accessToken,
  fetcher = fetch,
  timelineId,
  turnstileToken,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  timelineId: number;
  turnstileToken: string;
}): Promise<void> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/timeline/${timelineId}`,
    {
      body: JSON.stringify({ turnstileToken }),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': BANGUMI_USER_AGENT,
      },
      method: 'DELETE',
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

    throw new BangumiTimelineError(
      response.status,
      code === 'CAPTCHA_ERROR'
        ? '安全验证已过期，请重新验证后再试。'
        : response.status === 404
          ? '这条动态已不存在。'
          : response.status >= 500
            ? 'Bangumi 动态服务暂时不可用。'
            : '动态没有删除成功，请稍后重试。',
      code,
    );
  }
}
