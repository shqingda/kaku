import { z } from 'zod';

import type { GlobalTagPage } from '@/features/tags/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client';

const tagPageSchema = z.object({
  items: z.array(z.object({
    count: z.number().int().nonnegative(),
    name: z.string(),
  })),
  nextPage: z.number().int().positive().optional(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive().optional(),
});

export async function getGlobalTags(
  subjectType: number,
  page: number,
  signal?: AbortSignal,
): Promise<GlobalTagPage> {
  const query = new URLSearchParams({
    page: String(page),
    schema: '1',
    type: String(subjectType),
  });
  const response = await fetchPublicKaku(`/public/tags?${query}`, { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return tagPageSchema.parse(await response.json());
}
