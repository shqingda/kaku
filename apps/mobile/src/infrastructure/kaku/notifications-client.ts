import { notificationListSchema } from '@kaku/shared/notifications-contract';

import type { NotificationList } from '@/features/notifications/model';
import { KakuApiError, readErrorMessage } from './auth-client.ts';

export async function getNotifications(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal,
): Promise<NotificationList> {
  const response = await request('/me/notifications', { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return notificationListSchema.parse(await response.json());
}

export async function markNotificationsRead(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  ids?: number[],
): Promise<void> {
  const response = await request('/me/notifications/read', {
    body: JSON.stringify(ids?.length ? { ids } : {}),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
}
