import type { PublicEntityDetail } from '@/features/people/model';
import type { DiscussionReply } from '@/features/discussions/model';

import {
  getBangumiCharacter,
  getBangumiPerson,
} from '../api-v0/client';
import { getBangumiEntityComments } from '../api-next/client';
import { mapBangumiReplies } from '../discussions/adapter';
import { mapBangumiEntityDetail } from './adapter';

export async function getEntityComments(
  kind: 'character' | 'person',
  entityId: number,
  signal?: AbortSignal,
): Promise<DiscussionReply[]> {
  return mapBangumiReplies(
    await getBangumiEntityComments(kind, entityId, signal),
  );
}

export async function getCharacter(
  characterId: number,
  signal?: AbortSignal,
): Promise<PublicEntityDetail> {
  const { detail, peers, subjects } = await getBangumiCharacter(
    characterId,
    signal,
  );
  return mapBangumiEntityDetail(detail, subjects, peers, 'character');
}

export async function getPerson(
  personId: number,
  signal?: AbortSignal,
): Promise<PublicEntityDetail> {
  const { detail, peers, subjects } = await getBangumiPerson(personId, signal);
  return mapBangumiEntityDetail(detail, subjects, peers, 'person');
}
