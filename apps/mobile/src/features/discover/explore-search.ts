import {
  getSubjectChannelLabel,
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '../catalog/subject-types.ts';
import type { PeopleKind } from '../people-browser/model.ts';

export type ExploreSearchMode = 'subject' | PeopleKind;

const SEARCH_TAB_CHARACTER = 100;
const SEARCH_TAB_PERSON = 101;

export const EXPLORE_SEARCH_TYPES = [
  ...SUBJECT_TYPES,
  { id: SEARCH_TAB_CHARACTER, label: '角色' },
  { id: SEARCH_TAB_PERSON, label: '人物' },
] as const;

export function exploreSearchTabId(
  mode: ExploreSearchMode,
  subjectType: number,
) {
  if (mode === 'character') {
    return SEARCH_TAB_CHARACTER;
  }

  if (mode === 'person') {
    return SEARCH_TAB_PERSON;
  }

  return subjectType;
}

export function parseExploreSearchTab(tabId: number): {
  mode: ExploreSearchMode;
  subjectType?: number;
} {
  if (tabId === SEARCH_TAB_CHARACTER) {
    return { mode: 'character' };
  }

  if (tabId === SEARCH_TAB_PERSON) {
    return { mode: 'person' };
  }

  return { mode: 'subject', subjectType: tabId };
}

export function exploreSearchKindLabel(
  mode: ExploreSearchMode,
  subjectType: number,
) {
  if (mode === 'character') {
    return '角色';
  }

  if (mode === 'person') {
    return '人物';
  }

  return getSubjectTypeLabel(subjectType);
}

export function exploreSearchUnit(mode: ExploreSearchMode) {
  if (mode === 'character') {
    return '角色';
  }

  if (mode === 'person') {
    return '人物';
  }

  return '条目';
}

export function exploreSearchTotal(
  mode: ExploreSearchMode,
  pageTotal: number | undefined,
  loadedCount: number,
) {
  if (mode === 'subject') {
    return pageTotal ?? 0;
  }

  return loadedCount > 0 ? pageTotal ?? 0 : 0;
}

export function exploreChannelMeta(subjectType: number) {
  return `${getSubjectChannelLabel(subjectType)}频道 · 热门与高分精选`;
}
