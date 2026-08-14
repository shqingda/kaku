import { z } from 'zod';

import type { BrowseSort, BrowseSubjectPage } from '@/features/browse/model';
import { fetchPublicKaku, KakuApiError, readErrorMessage } from './auth-client.ts';

const responseSchema = z.object({
  items: z.array(z.object({
    coverUrl: z.string().url().optional(),
    id: z.number().int().positive(),
    score: z.number().optional(),
    title: z.string(),
    type: z.number().int(),
  })),
  nextPage: z.number().int().positive().optional(),
  totalPages: z.number().int().nonnegative(),
});

export async function getBrowseSubjects({
  page,
  signal,
  sort,
  subjectType,
  tag,
  year,
}: {
  page: number;
  signal?: AbortSignal;
  sort: BrowseSort;
  subjectType: number;
  tag?: string;
  year?: number;
}): Promise<BrowseSubjectPage> {
  const query = new URLSearchParams({
    page: String(page),
    sort,
    type: String(subjectType),
  });
  if (year) query.set('year', String(year));
  if (tag) query.append('tag', tag);

  const response = await fetchPublicKaku(`/public/browse?${query}`, { signal });
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return responseSchema.parse(await response.json());
}
