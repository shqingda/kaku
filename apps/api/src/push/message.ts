import type { UserNotification } from '../notifications/model.ts';

export function composePushMessage(items: UserNotification[]): {
  body: string;
  title: string;
} {
  if (items.length === 1) {
    const item = items[0];
    const detail = item.title ? `：${item.title}` : '';
    return {
      body: `${item.sender.nickname}${item.action}${detail}`,
      title: 'Kaku',
    };
  }

  return {
    body: `${items.length} 条未读通知`,
    title: 'Kaku',
  };
}
