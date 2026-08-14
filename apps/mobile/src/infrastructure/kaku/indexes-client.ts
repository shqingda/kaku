import { z } from 'zod';

import type {
  GlobalIndexPage,
  IndexSort,
} from '@/features/indexes/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client.ts';

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
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return createdIndexSchema.parse(await response.json());
}

export async function updateIndex(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  indexId: number,
  input: { desc: string; isPrivate?: boolean; title: string },
): Promise<void> {
  const response = await request(`/me/indexes/${indexId}`, {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
}

export async function deleteIndex(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  indexId: number,
): Promise<void> {
  const response = await request(`/me/indexes/${indexId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
}

const indexCollectionSchema = z.object({ collected: z.boolean() });

export async function getIndexCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  indexId: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await request(`/me/indexes/${indexId}/collection`, {
    signal,
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return indexCollectionSchema.parse(await response.json()).collected;
}

export async function setIndexCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  indexId: number,
  shouldCollect: boolean,
): Promise<boolean> {
  const response = await request(`/me/indexes/${indexId}/collect`, {
    method: shouldCollect ? 'POST' : 'DELETE',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return indexCollectionSchema.parse(await response.json()).collected;
}
