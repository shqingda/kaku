import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';
import type {
  NotificationList,
  NotificationTarget,
  UserNotification,
} from './model.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

const notificationSchema = z.object({
  createdAt: z.number().int(),
  id: z.number().int().positive(),
  mainID: z.number().int().nonnegative(),
  relatedID: z.number().int().nonnegative(),
  sender: z.object({
    avatar: z.object({ small: z.string().optional() }),
    nickname: z.string(),
    username: z.string(),
  }),
  title: z.string(),
  type: z.number().int(),
  unread: z.boolean(),
});

const notificationListSchema = z.object({
  data: z.array(notificationSchema),
  total: z.number().int().nonnegative(),
});

export class BangumiNotificationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiNotificationError';
    this.status = status;
  }
}

function describeNotification(type: number) {
  const actions: Record<number, string> = {
    1: '回复了你的小组话题',
    2: '回复了你在小组中的发言',
    3: '回复了你的条目讨论',
    4: '回复了你在条目讨论中的发言',
    5: '回复了你的角色讨论',
    6: '回复了你在角色讨论中的发言',
    7: '回复了你的日志',
    8: '回复了你在日志中的发言',
    9: '回复了你的章节讨论',
    10: '回复了你在章节讨论中的发言',
    11: '在目录中给你留言了',
    12: '在目录中回复了你',
    13: '在人物讨论中回复了你',
    14: '请求加你为好友',
    15: '通过了你的好友请求',
    17: '回复了你的社团讨论',
    18: '在社团讨论中回复了你',
    19: '在同人作品中回复了你',
    20: '回复了你的展会讨论',
    21: '在展会讨论中回复了你',
    22: '回复了你的吐槽',
    23: '在小组话题中提到了你',
    24: '在条目讨论中提到了你',
    25: '在角色讨论中提到了你',
    26: '在人物讨论中提到了你',
    27: '在目录中提到了你',
    28: '在吐槽中提到了你',
    29: '在日志中提到了你',
    30: '在章节讨论中提到了你',
    31: '在社团留言板中提到了你',
    32: '在社团讨论中提到了你',
    33: '在同人作品中提到了你',
    34: '在展会讨论中提到了你',
    35: '通过了你的条目修订',
    36: '通过了你的章节修订',
    37: '拒绝了你的条目修订',
    38: '拒绝了你的章节修订',
    39: '将你的条目修订标记为过期',
    40: '将你的章节修订标记为过期',
    41: '通过了你的角色修订',
    42: '通过了你的人物修订',
    43: '拒绝了你的角色修订',
    44: '拒绝了你的人物修订',
    45: '将你的角色修订标记为过期',
    46: '将你的人物修订标记为过期',
    47: '回复了你的条目修订',
    48: '回复了你的章节修订',
    49: '回复了你的角色修订',
    50: '回复了你的人物修订',
  };

  return actions[type] ?? '向你发送了一条通知';
}

function notificationTarget(
  notification: z.infer<typeof notificationSchema>,
): NotificationTarget | undefined {
  if (notification.type === 1 || notification.type === 2) {
    return {
      id: notification.mainID,
      kind: 'group-topic',
      replyId: notification.relatedID || undefined,
    };
  }

  if (notification.type === 3 || notification.type === 4) {
    return {
      id: notification.mainID,
      kind: 'subject-topic',
      replyId: notification.relatedID || undefined,
    };
  }

  if (notification.type === 14 || notification.type === 15) {
    return { kind: 'user', username: notification.sender.username };
  }

  return undefined;
}

function toNotification(
  notification: z.infer<typeof notificationSchema>,
): UserNotification {
  const isFriendNotification =
    notification.type === 14 || notification.type === 15;

  return {
    action: describeNotification(notification.type),
    createdAt: notification.createdAt,
    id: notification.id,
    sender: {
      avatarUrl: notification.sender.avatar.small || undefined,
      nickname: notification.sender.nickname,
      username: notification.sender.username,
    },
    target: notificationTarget(notification),
    // Bangumi uses the sender nickname as the title for friend notices. The
    // mobile row already shows the sender, so repeating it adds no information.
    title: isFriendNotification ? '' : notification.title,
    unread: notification.unread,
  };
}

export async function getBangumiNotifications({
  accessToken,
  fetcher = fetch,
  limit = 30,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  limit?: number;
}): Promise<NotificationList> {
  const url = new URL(`${BANGUMI_PRIVATE_API_URL}/notify`);
  url.searchParams.set('limit', String(limit));

  const response = await fetcher(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new BangumiNotificationError(
      response.status,
      response.status >= 500
        ? 'Bangumi 通知服务暂时不可用。'
        : '通知暂时无法读取。',
    );
  }

  const result = notificationListSchema.parse(await response.json());
  const items = result.data.map(toNotification);

  return {
    items,
    total: result.total,
    unreadCount: items.filter((item) => item.unread).length,
  };
}

export async function markBangumiNotificationsRead({
  accessToken,
  fetcher = fetch,
  ids,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  ids?: number[];
}): Promise<void> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}/clear-notify`, {
    body: JSON.stringify(ids?.length ? { id: ids } : {}),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new BangumiNotificationError(
      response.status,
      response.status >= 500
        ? 'Bangumi 通知服务暂时不可用。'
        : '通知暂时无法标记为已读。',
    );
  }
}
