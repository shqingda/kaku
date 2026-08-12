import { z } from 'zod';

import type { NotificationList } from '@/features/notifications/model';
import { readErrorMessage } from './auth-client';

const targetSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('group-topic'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('subject-topic'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({ kind: z.literal('user'), username: z.string() }),
]);

const responseSchema = z.object({
  items: z.array(
    z.object({
      action: z.string(),
      createdAt: z.number().int(),
      id: z.number().int().positive(),
      sender: z.object({
        avatarUrl: z.string().url().optional(),
        nickname: z.string(),
        username: z.string(),
      }),
      target: targetSchema.optional(),
      title: z.string(),
      unread: z.boolean(),
    }),
  ),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});

export async function getNotifications(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal,
): Promise<NotificationList> {
  const response = await request('/me/notifications', { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
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
    throw new Error(await readErrorMessage(response));
  }
}
