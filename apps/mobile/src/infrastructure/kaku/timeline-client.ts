import { z } from 'zod';
import { friendTimelinePageSchema } from '@kaku/shared/timeline-contract';

import type { FriendTimelinePage } from '@/features/timeline/model';
import { KakuApiError, readErrorMessage } from './auth-client.ts';
import { getFriendTimelinePath } from './timeline-pagination.ts';

const createdTimelineSchema = z.object({ id: z.number().int().positive() });

export async function getFriendTimeline(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  until?: number,
  signal?: AbortSignal,
): Promise<FriendTimelinePage> {
  const response = await request(getFriendTimelinePath(until), { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return friendTimelinePageSchema.parse(await response.json());
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
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return createdTimelineSchema.parse(await response.json());
}
