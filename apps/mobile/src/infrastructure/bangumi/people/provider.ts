import type { PeopleProvider } from '@/features/people/model';

import {
  getBangumiCharacter,
  getBangumiPerson,
} from '../api-v0/client';
import { getBangumiEntityComments } from '../api-next/client';
import { mapBangumiReplies } from '../discussions/adapter';
import { mapBangumiEntityDetail } from './adapter';

export const bangumiPeopleProvider: PeopleProvider = {
  async getComments(kind, entityId, signal) {
    return mapBangumiReplies(
      await getBangumiEntityComments(kind, entityId, signal),
    );
  },
  async getCharacter(characterId, signal) {
    const { detail, peers, subjects } = await getBangumiCharacter(
      characterId,
      signal,
    );
    return mapBangumiEntityDetail(detail, subjects, peers, 'character');
  },
  async getPerson(personId, signal) {
    const { detail, peers, subjects } = await getBangumiPerson(personId, signal);
    return mapBangumiEntityDetail(detail, subjects, peers, 'person');
  },
};
