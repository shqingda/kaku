import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthStore } from '../auth/store.ts';
import type { Env } from '../env.ts';
import { getBangumiNotifications } from '../notifications/bangumi-client.ts';

import { deliverPushForUser } from './deliver.ts';
import { sendExpoPush } from './expo-client.ts';
import {
  createD1PushDeviceStore,
  type PushDeviceStore,
} from './store.ts';

export type PushPollResult = {
  failedUsers: number;
  primedUsers: number;
  sentUsers: number;
  users: number;
};

export async function pollRegisteredPushUsers({
  env,
  fetcher = fetch,
  now = Date.now(),
  authStore,
  pushStore,
}: {
  authStore: AuthStore;
  env: Env;
  fetcher?: typeof fetch;
  now?: number;
  pushStore?: PushDeviceStore;
}): Promise<PushPollResult> {
  const devices = pushStore ?? createD1PushDeviceStore(env.DB);
  const userIds = await devices.listUserIds();
  const result: PushPollResult = {
    failedUsers: 0,
    primedUsers: 0,
    sentUsers: 0,
    users: userIds.length,
  };

  for (const userId of userIds) {
    try {
      const userDevices = await devices.listByUser(userId);
      const accessToken = await getValidBangumiAccessToken({
        env,
        fetcher,
        now,
        store: authStore,
        userId,
      });
      const delivery = await deliverPushForUser({
        devices: userDevices,
        loadNotifications: () =>
          getBangumiNotifications({ accessToken, fetcher }),
        saveCursor: (lastNotificationId) =>
          devices.setLastNotificationId(userId, lastNotificationId),
        sendPush: (tokens, payload) => sendExpoPush(fetcher, tokens, payload),
      });

      await Promise.all(
        delivery.invalidTokens.map((token) => devices.deleteByToken(token)),
      );
      if (delivery.primed) result.primedUsers += 1;
      if (delivery.sent > 0) result.sentUsers += 1;
    } catch (error) {
      result.failedUsers += 1;
      console.error('bangumi_push_poll_failed', {
        userId,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return result;
}
