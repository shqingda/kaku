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
  saveCursor: (lastNotificationId: number) => Promise<void>;
  sendPush: (tokens: string[], payload: ExpoPushPayload) => Promise<string[]>;
}): Promise<{ invalidTokens: string[]; primed: boolean; sent: number }> {
  if (devices.length === 0) {
    return { invalidTokens: [], primed: false, sent: 0 };
  }

  const notifications = await loadNotifications();
  const seenIds = notifications.items.map((item) => item.id);
  const maxSeenId = seenIds.length > 0 ? Math.max(...seenIds) : 0;
  const cursors = devices.map((device) => device.lastNotificationId);
  const needsPrime = cursors.some((cursor) => cursor == null);

  if (needsPrime) {
    await saveCursor(maxSeenId);
    return { invalidTokens: [], primed: true, sent: 0 };
  }

  const cursor = Math.min(...cursors.map((value) => value ?? 0));
  const fresh = notifications.items.filter(
    (item) => item.unread && item.id > cursor,
  );

  if (fresh.length === 0) {
    if (maxSeenId > cursor) {
      await saveCursor(maxSeenId);
    }
    return { invalidTokens: [], primed: false, sent: 0 };
  }

  const message = composePushMessage(fresh);
  const invalidTokens = await sendPush(
    devices.map((device) => device.token),
    {
      body: message.body,
      title: message.title,
      unreadCount: notifications.unreadCount,
    },
  );
  await saveCursor(Math.max(maxSeenId, ...fresh.map((item) => item.id)));
  return { invalidTokens, primed: false, sent: 1 };
}
