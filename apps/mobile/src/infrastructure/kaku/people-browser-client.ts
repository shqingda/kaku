import { z } from 'zod';

import type {
  GlobalPeoplePage,
  PeopleKind,
  PeopleSort,
} from '@/features/people-browser/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client.ts';

const peoplePageSchema = z.object({
  items: z.array(
    z.object({
      categories: z.array(z.string()),
      commentCount: z.number().int().nonnegative(),
      id: z.number().int().positive(),
      imageUrl: z.string().url().optional(),
      kind: z.enum(['character', 'person']),
      metadata: z.string(),
      name: z.string(),
    }),
  ),
  nextPage: z.number().int().positive().optional(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive().optional(),
});

export async function getGlobalPeople(
  kind: PeopleKind,
  sort: PeopleSort,
  type: number | undefined,
  gender: number | undefined,
  page: number,
  signal?: AbortSignal,
): Promise<GlobalPeoplePage> {
  const query = new URLSearchParams({
    kind,
    page: String(page),
    schema: '1',
    sort,
  });
  if (type) query.set('type', String(type));
  if (gender) query.set('gender', String(gender));

  const response = await fetchPublicKaku(`/public/people?${query}`, { signal });
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return peoplePageSchema.parse(await response.json());
}
