import type {
  PeopleKind,
  PeopleSearchPage,
} from '@/features/people-browser/model';

import { searchBangumiEntities } from '../api-v0/client';
import {
  toCharacterSearchPage,
  toPersonSearchPage,
} from './search-adapter';

export async function searchPeople(
  kind: PeopleKind,
  keyword: string,
  offset: number,
  signal?: AbortSignal,
): Promise<PeopleSearchPage> {
  const response = await searchBangumiEntities(
    kind,
    keyword,
    offset,
    signal,
  );

  return response.kind === 'character'
    ? toCharacterSearchPage(response.page)
    : toPersonSearchPage(response.page);
}
