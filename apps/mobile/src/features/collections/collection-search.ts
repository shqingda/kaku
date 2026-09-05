import type { PublicUserCollection, PublicUserCollectionPage } from '../users/model';
import type { CollectionStatus } from '../watching/model';

export type CollectionSearchPreferences = {
  keyword: string;
  subjectType: number;
  status?: CollectionStatus;
};
export const DEFAULT_COLLECTION_SEARCH: CollectionSearchPreferences = { keyword: '', subjectType: 0 };
export const collectionSearchStorageKey = (userId: number) => `kaku:collection-search:v1:${userId}`;
export function parseCollectionSearch(raw: string | null): CollectionSearchPreferences {
  if (!raw) return DEFAULT_COLLECTION_SEARCH;
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('invalid preferences');
  return {
    keyword: typeof value.keyword === 'string' ? value.keyword : '',
    subjectType: [0, 1, 2, 3, 4, 6].includes(value.subjectType) ? value.subjectType : 0,
    status: ['wish', 'completed', 'doing', 'onHold', 'dropped'].includes(value.status) ? value.status : undefined,
  };
}
export function collectSearchPages(pages: PublicUserCollectionPage[]) {
  const items = [...new Map(pages.flatMap(page => page.items).map(item => [item.id, item])).values()];
  const total = pages.at(-1)?.total ?? 0;
  const complete = pages.length > 0 && pages.at(-1)?.nextOffset === undefined && items.length === total;
  return { items, total, complete };
}
export function searchCollections(items: PublicUserCollection[], preferences: CollectionSearchPreferences) {
  const keyword = preferences.keyword.trim().normalize('NFKC').toLocaleLowerCase();
  return items.filter(item =>
    (!preferences.subjectType || item.subjectType === preferences.subjectType) &&
    (!preferences.status || item.collectionStatus === preferences.status) &&
    (!keyword || [item.title, item.originalTitle ?? ''].some(name => name.normalize('NFKC').toLocaleLowerCase().includes(keyword))),
  ).sort((a, b) =>
    (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || a.id - b.id);
}
