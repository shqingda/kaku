import { z } from 'zod';

import type {
  PersonalCollection,
  PersonalCollectionUpdate,
} from '@/features/collections/model';
import { readErrorMessage } from './auth-client';

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
    throw new Error(await readErrorMessage(response));
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
    throw new Error(await readErrorMessage(response));
  }

  return responseSchema.parse(await response.json()).collection;
}
