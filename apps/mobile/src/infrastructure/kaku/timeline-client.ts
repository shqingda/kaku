import { z } from 'zod';

import type { FriendTimelinePage } from '@/features/timeline/model';
import { readErrorMessage } from './auth-client';
import { getFriendTimelinePath } from './timeline-pagination';

const timelineItemSchema = z.object({
  createdAt: z.number().int(),
  entityId: z.number().int().positive().optional(),
  entityKind: z.enum(['character', 'person']).optional(),
  entityTitle: z.string().optional(),
  id: z.number().int().positive(),
  leadingText: z.string().optional(),
  replies: z.number().int().nonnegative(),
  subjectId: z.number().int().positive().optional(),
  subjectTitle: z.string().optional(),
  text: z.string(),
  trailingText: z.string().optional(),
  user: z.object({
    avatarUrl: z.string().url().optional(),
    nickname: z.string(),
    username: z.string(),
  }),
});

const responseSchema = z.object({
  items: z.array(timelineItemSchema),
  nextUntil: z.number().int().positive().optional(),
});
const createdTimelineSchema = z.object({ id: z.number().int().positive() });

export async function getFriendTimeline(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  until?: number,
  signal?: AbortSignal,
): Promise<FriendTimelinePage> {
  const response = await request(getFriendTimelinePath(until), { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}

export async function createTimelineSay(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  content: string,
  turnstileToken: string,
): Promise<{ id: number }> {
  const response = await request('/me/timeline', {
    body: JSON.stringify({ content, turnstileToken }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createdTimelineSchema.parse(await response.json());
}
