import type { PeopleProvider } from '@/features/people/model';

import {
  getBangumiCharacter,
  getBangumiPerson,
} from '../api-v0/client';
import { mapBangumiEntityDetail } from './adapter';

export const bangumiPeopleProvider: PeopleProvider = {
  async getCharacter(characterId) {
    const { detail, peers, subjects } = await getBangumiCharacter(characterId);
    return mapBangumiEntityDetail(detail, subjects, peers, 'character');
  },
  async getPerson(personId) {
    const { detail, peers, subjects } = await getBangumiPerson(personId);
    return mapBangumiEntityDetail(detail, subjects, peers, 'person');
  },
};
