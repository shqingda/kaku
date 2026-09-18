import type { NotificationList } from '../notifications/model.ts';

import type { ExpoPushPayload } from './expo-client.ts';
import { composePushMessage } from './message.ts';
import type { StoredPushDevice } from './store.ts';

export async function deliverPushForUser({
  devices,
  loadNotifications,
  saveCursor,
  sendPush,
}: {
  devices: StoredPushDevice[];
  loadNotifications: () => Promise<NotificationList>;
  saveCursor: (token: string, lastNotificationId: number) => Promise<void>;
  sendPush: (tokens: string[], payload: ExpoPushPayload) => Promise<string[]>;
}): Promise<{ invalidTokens: string[]; primed: boolean; sent: number }> {
  if (devices.length === 0) {
    return { invalidTokens: [], primed: false, sent: 0 };
  }

  const notifications = await loadNotifications();
  const seenIds = notifications.items.map((item) => item.id);
  const maxSeenId = seenIds.length > 0 ? Math.max(...seenIds) : 0;
  const groups = new Map<number | null, StoredPushDevice[]>();
  for (const device of devices) {
    const group = groups.get(device.lastNotificationId) ?? [];
    group.push(device);
    groups.set(device.lastNotificationId, group);
  }

  const invalidTokens: string[] = [];
  let sent = 0;
  for (const [cursor, group] of groups) {
    const fresh = cursor === null ? [] : notifications.items.filter(
      (item) => item.unread && item.id > cursor,
    );
    if (fresh.length > 0) {
      const message = composePushMessage(fresh);
      invalidTokens.push(...await sendPush(group.map((device) => device.token), {
        body: message.body,
        title: message.title,
        unreadCount: notifications.unreadCount,
      }));
      sent += 1;
    }
    if (cursor === null || maxSeenId > cursor) {
      await Promise.all(group.map((device) => saveCursor(device.token, maxSeenId)));
    }
  }
  return { invalidTokens, primed: groups.has(null), sent };
}
