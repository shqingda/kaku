import { z } from 'zod';

import type { FriendTimelinePage } from '@/features/timeline/model';
import { readErrorMessage } from './auth-client';
import { getFriendTimelinePath } from './timeline-pagination';

const timelineItemSchema = z.object({
  createdAt: z.number().int(),
  id: z.number().int().positive(),
  replies: z.number().int().nonnegative(),
  subjectId: z.number().int().positive().optional(),
  text: z.string(),
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
): Promise<FriendTimelinePage> {
  const response = await request(getFriendTimelinePath(until));

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
