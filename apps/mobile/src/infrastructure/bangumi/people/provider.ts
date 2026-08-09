import type { PeopleProvider } from '@/features/people/model';

import {
  getBangumiCharacter,
  getBangumiPerson,
} from '../api-v0/client';
import { mapBangumiEntityDetail } from './adapter';

export const bangumiPeopleProvider: PeopleProvider = {
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
