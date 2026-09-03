import { z } from 'zod';

import type { RecentSubjectsRecord } from '@/features/history/recent-subjects-model';
import { KakuApiError, readErrorMessage } from './auth-client.ts';

const recentSubjectSchema = z.object({
  coverUrl: z.string().optional(),
  id: z.number().int().positive(),
  title: z.string(),
  type: z.number().int(),
  viewedAt: z.number().nonnegative(),
});

const responseSchema = z.object({
  recentSubjects: z.object({
    items: z.array(recentSubjectSchema),
    updatedAt: z.number().nonnegative().nullable(),
  }),
});

export async function parseRecentSubjectsResponse(
  response: Response,
): Promise<RecentSubjectsRecord> {
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return responseSchema.parse(await response.json()).recentSubjects;
}
