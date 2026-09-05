import { z } from 'zod';

import type {
  PersonalCollection,
  PersonalCollectionUpdate,
} from '@/features/collections/model';
import { KakuApiError, readErrorMessage } from './auth-client.ts';

const personalCollectionSchema = z.object({
  collectionStatus: z.enum([
    'wish',
    'completed',
    'doing',
    'onHold',
    'dropped',
  ]),
  comment: z.string(),
  isPrivate: z.boolean(),
  readChapterCount: z.number().int().nonnegative().optional(),
  readVolumeCount: z.number().int().nonnegative().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  subjectId: z.number().int().positive(),
  tags: z.array(z.string()),
  watchedEpisodeNumbers: z.array(z.number().int().positive()),
});

const responseSchema = z.object({
  collection: personalCollectionSchema.nullable(),
});

export async function getPersonalCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  subjectId: number,
  signal?: AbortSignal,
): Promise<PersonalCollection | null> {
  const response = await request(`/me/collections/${subjectId}`, { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return responseSchema.parse(await response.json()).collection;
}

export async function savePersonalCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  subjectId: number,
  update: PersonalCollectionUpdate,
): Promise<PersonalCollection | null> {
  const response = await request(`/me/collections/${subjectId}`, {
    body: JSON.stringify(update),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return responseSchema.parse(await response.json()).collection;
}

const collectionListPageSchema = z.object({
  total: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().optional(),
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      originalTitle: z.string().optional(),
      coverUrl: z.string().optional(),
      subjectType: z.number().int(),
      collectionStatus: z.enum([
        'wish',
        'completed',
        'doing',
        'onHold',
        'dropped',
      ]),
      progress: z.number().nonnegative(),
      volumeProgress: z.number().nonnegative(),
      totalEpisodes: z.number().nonnegative(),
      rate: z.number().optional(),
      updatedAt: z.string(),
    }),
  ),
});

export async function getMyCollectionPage(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  offset: number,
  signal?: AbortSignal,
) {
  const response = await request(`/me/collections?offset=${offset}`, { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  const page = collectionListPageSchema.parse(await response.json());
  if (
    page.nextOffset !== undefined &&
    (page.nextOffset <= offset || page.items.length === 0)
  ) {
    throw new Error('收藏分页异常，请刷新重试');
  }

  return page;
}
