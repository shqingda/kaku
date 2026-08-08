import type { DiscoverSubjectPage } from '@/features/discover/model';

import { z } from 'zod';

import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client';

const rankedSubjectPageSchema = z.object({
  items: z.array(
    z.object({
      coverUrl: z.string().optional(),
      date: z.string().optional(),
      id: z.number().int().positive(),
      score: z.number().optional(),
      title: z.string(),
      type: z.number().int(),
    }),
  ),
  nextOffset: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
});

export async function getPublicRankedSubjects(
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
): Promise<DiscoverSubjectPage> {
  const query = new URLSearchParams({
    offset: String(offset),
    type: String(subjectType),
  });
  const response = await fetchPublicKaku(`/public/rankings?${query}`, {
    signal,
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return rankedSubjectPageSchema.parse(await response.json());
}
