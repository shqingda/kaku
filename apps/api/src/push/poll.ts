import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthStore } from '../auth/store.ts';
import type { Env } from '../env.ts';
import { getBangumiNotifications } from '../notifications/bangumi-client.ts';

import { deliverPushForUser } from './deliver.ts';
import { getExpoPushReceipts, sendExpoPush } from './expo-client.ts';
import { createD1PushDeviceStore, type PushDeviceStore, type StoredPushDevice } from './store.ts';

const RECEIPT_ERRORS = new Set(['DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'MismatchSenderId', 'InvalidCredentials']);

export type PushPollResult = {
  checkedReceipts: number;
  expiredReceipts: number;
  failedReceipts: number;
  failedUsers: number;
  primedUsers: number;
  sentUsers: number;
  users: number;
};

export async function pollRegisteredPushUsers({
  env, fetcher = fetch, now, authStore, pushStore,
}: {
  authStore: AuthStore;
  env: Env;
  fetcher?: typeof fetch;
  now?: number;
  pushStore?: PushDeviceStore;
}): Promise<PushPollResult> {
  const currentTime = () => now ?? Date.now();
  const devices = pushStore ?? createD1PushDeviceStore(env.DB);
  const userIds = await devices.listUserIds(currentTime());
  const result: PushPollResult = {
    checkedReceipts: 0, expiredReceipts: 0, failedReceipts: 0,
    failedUsers: 0, primedUsers: 0, sentUsers: 0, users: userIds.length,
  };
  try {
    result.expiredReceipts = await devices.deleteExpiredReceipts(currentTime());
    if (result.expiredReceipts > 0) console.error('push_receipts_expired', { count: result.expiredReceipts });
  } catch {
    result.failedReceipts += 1;
    console.error('push_receipt_cleanup_failed');
  }
  if (!env.EXPO_ACCESS_TOKEN) {
    console.error('push_expo_access_token_missing', { users: userIds.length });
    result.failedUsers = userIds.length;
    return result;
  }

  // Expo tickets are only queue acceptance. Check provider receipts at least
  // 15 minutes later; Expo removes them after 24 hours.
  // https://docs.expo.dev/push-notifications/sending-notifications/#check-push-receipts-for-errors
  try {
    const pending = await devices.listPendingReceipts(currentTime());
    const receipts = await getExpoPushReceipts(fetcher, pending.map((receipt) => receipt.ticketId), {
      accessToken: env.EXPO_ACCESS_TOKEN,
    });
    // Missing receipts must yield their slot to unexamined tickets next time.
    await devices.markReceiptChecks(pending.map((receipt) => receipt.ticketId), currentTime());
    const confirmedIds: string[] = [];
    for (const pendingReceipt of pending) {
      const receipt = receipts[pendingReceipt.ticketId];
      if (!receipt) continue;
      if (receipt.status === 'error') {
        result.failedReceipts += 1;
        if (receipt.details?.error === 'DeviceNotRegistered') await devices.deleteRegistration(pendingReceipt);
        else {
          const error = receipt.details?.error;
          console.error('push_receipt_rejected', { reason: error && RECEIPT_ERRORS.has(error) ? error : 'UnknownError' });
        }
      }
      confirmedIds.push(pendingReceipt.ticketId);
      result.checkedReceipts += 1;
    }
    await devices.deleteReceipts(confirmedIds);
  } catch {
    result.failedReceipts += 1;
    console.error('push_receipt_check_failed');
  }

  async function pollUser(userId: number) {
    try {
      const userDevices = await devices.listByUser(userId, currentTime());
      if (userDevices.length === 0) return;
      const accessToken = await getValidBangumiAccessToken({ env, fetcher, now: currentTime(), store: authStore, userId });
      const resolveDevices = async (snapshot: StoredPushDevice[]) => {
        const current = await devices.listByUser(userId, currentTime());
        return snapshot.filter((device) => device.registrationId && current.some((item) =>
          item.token === device.token && item.sessionId === device.sessionId && item.registrationId === device.registrationId));
      };
      const delivery = await deliverPushForUser({
        devices: userDevices,
        resolveDevices,
        loadNotifications: () => getBangumiNotifications({ accessToken,
          fetcher: (input, init) => fetcher(input, { ...init, signal: AbortSignal.timeout(12_000) }),
        }),
        commitDelivery: (batch, lastNotificationId, tickets) => devices.commitDelivery({
          createdAt: currentTime(), devices: batch, lastNotificationId, tickets,
        }),
        sendPush: async (tokens, payload) => {
          const delivery = await sendExpoPush(fetcher, tokens, payload, { accessToken: env.EXPO_ACCESS_TOKEN });
          for (const token of delivery.invalidTokens) {
            const snapshot = userDevices.find((device) => device.token === token);
            if (!snapshot) continue;
            try {
              await devices.deleteRegistration(snapshot);
            } catch {
              // Keep accepted tickets durable even when an invalid token needs
              // another cleanup attempt on the next poll.
              console.error('push_invalid_registration_cleanup_failed', { userId });
            }
          }
          return delivery;
        },
      });
      if (delivery.failed > 0) {
        result.failedUsers += 1;
        console.error('push_ticket_rejected', { userId, count: delivery.failed });
      }
      if (delivery.primed) result.primedUsers += 1;
      if (delivery.sent > 0) result.sentUsers += 1;
    } catch {
      result.failedUsers += 1;
      console.error('bangumi_push_poll_failed', { userId });
    }
  }

  let nextUser = 0;
  await Promise.all(Array.from({ length: Math.min(4, userIds.length) }, async () => {
    while (nextUser < userIds.length) {
      const userId = userIds[nextUser++];
      if (userId !== undefined) await pollUser(userId);
    }
  }));
  return result;
}
