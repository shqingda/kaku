import type { NotificationList } from '../notifications/model.ts';

import type { ExpoAcceptedTicket, ExpoPushPayload, ExpoPushResult } from './expo-client.ts';
import { composePushMessage } from './message.ts';
import type { StoredPushDevice } from './store.ts';

export async function deliverPushForUser({
  devices,
  loadNotifications,
  resolveDevices = async (snapshot) => snapshot,
  commitDelivery,
  sendPush,
}: {
  devices: StoredPushDevice[];
  loadNotifications: () => Promise<NotificationList>;
  resolveDevices?: (snapshot: StoredPushDevice[]) => Promise<StoredPushDevice[]>;
  commitDelivery: (devices: StoredPushDevice[], cursor: number, tickets: ExpoAcceptedTicket[]) => Promise<void>;
  sendPush: (tokens: string[], payload: ExpoPushPayload) => Promise<ExpoPushResult>;
}): Promise<{ failed: number; invalidTokens: string[]; primed: boolean; sent: number }> {
  if (devices.length === 0) return { failed: 0, invalidTokens: [], primed: false, sent: 0 };

  const notifications = await loadNotifications();
  const maxSeenId = notifications.items.reduce((max, item) => Math.max(max, item.id), 0);
  const groups = new Map<number | null, StoredPushDevice[]>();
  for (const device of await resolveDevices(devices)) {
    const group = groups.get(device.lastNotificationId) ?? [];
    group.push(device);
    groups.set(device.lastNotificationId, group);
  }

  const invalidTokens: string[] = [];
  let sent = 0;
  let failed = 0;
  for (const [cursor, group] of groups) {
    const fresh = cursor === null ? [] : notifications.items.filter((item) => item.unread && item.id > cursor);
    for (let offset = 0; offset < group.length; offset += 100) {
      // Recheck each batch immediately before its external side effect. Revoking
      // a session cannot recall a push already accepted by Expo.
      const batch = await resolveDevices(group.slice(offset, offset + 100));
      if (batch.length === 0) continue;
      if (fresh.length > 0) {
        const message = composePushMessage(fresh);
        const result = await sendPush(batch.map((device) => device.token), {
          body: message.body, title: message.title, unreadCount: notifications.unreadCount,
        });
        invalidTokens.push(...result.invalidTokens);
        failed += result.failedTokens.length;
        const accepted = batch.filter((device) => result.tickets.some((ticket) => ticket.token === device.token));
        await commitDelivery(accepted, maxSeenId, result.tickets);
        if (accepted.length > 0) sent += 1;
      } else if (cursor === null || maxSeenId > cursor) {
        await commitDelivery(batch, maxSeenId, []);
      }
    }
  }
  return { failed, invalidTokens, primed: groups.has(null), sent };
}
