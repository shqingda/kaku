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
    3: '回复了你的目录话题',
    4: '回复了你在目录中的发言',
    5: '回复了你的角色话题',
    6: '回复了你在角色话题中的发言',
    7: '回复了你的条目话题',
    8: '回复了你在条目讨论中的发言',
    14: '请求加你为好友',
    15: '通过了你的好友请求',
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
    return { id: notification.mainID, kind: 'group-topic' };
  }

  if (notification.type === 7 || notification.type === 8) {
    return { id: notification.mainID, kind: 'subject-topic' };
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
