import { z } from 'zod';

import { readErrorMessage } from './auth-client';

export type EntityCollectionKind = 'character' | 'person';

const responseSchema = z.object({ collected: z.boolean() });

function path(kind: EntityCollectionKind, entityId: number) {
  return `/me/entities/${kind}/${entityId}/collection`;
}

export async function getEntityCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  kind: EntityCollectionKind,
  entityId: number,
  signal?: AbortSignal,
) {
  const response = await request(path(kind, entityId), { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return responseSchema.parse(await response.json()).collected;
}

export async function saveEntityCollection(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  kind: EntityCollectionKind,
  entityId: number,
  collected: boolean,
) {
  const response = await request(path(kind, entityId), {
    body: JSON.stringify({ collected }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return responseSchema.parse(await response.json()).collected;
}
