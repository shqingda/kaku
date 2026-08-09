import type {
  PeopleSearchProvider,
} from '@/features/people-browser/model';

import { searchBangumiEntities } from '../api-v0/client';
import {
  toCharacterSearchPage,
  toPersonSearchPage,
} from './search-adapter';

export const bangumiPeopleSearchProvider: PeopleSearchProvider = {
  async search(kind, keyword, offset, signal) {
    const response = await searchBangumiEntities(
      kind,
      keyword,
      offset,
      signal,
    );

    return response.kind === 'character'
      ? toCharacterSearchPage(response.page)
      : toPersonSearchPage(response.page);
  },
};
