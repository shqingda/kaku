import { z } from 'zod';

import type {
  GlobalIndexPage,
  IndexSort,
} from '@/features/indexes/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client';

const indexPageSchema = z.object({
  items: z.array(
    z.object({
      author: z.string(),
      authorAvatarUrl: z.string().url().optional(),
      authorUsername: z.string(),
      description: z.string(),
      id: z.number().int().positive(),
      itemCount: z.number().int().nonnegative(),
      title: z.string(),
      updatedAt: z.number().int().nonnegative(),
    }),
  ),
  nextPage: z.number().int().positive().optional(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive().optional(),
});

export async function getGlobalIndexes(
  sort: IndexSort,
  page: number,
  signal?: AbortSignal,
): Promise<GlobalIndexPage> {
  const query = new URLSearchParams({
    page: String(page),
    sort,
  });
  const response = await fetchPublicKaku(`/public/indexes?${query}`, { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return indexPageSchema.parse(await response.json());
}

const createdIndexSchema = z.object({ id: z.number().int().positive() });

export async function createIndex(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  input: { desc: string; isPrivate?: boolean; title: string },
): Promise<{ id: number }> {
  const response = await request('/me/indexes', {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createdIndexSchema.parse(await response.json());
}
