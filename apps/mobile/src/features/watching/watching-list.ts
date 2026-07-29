import type { WatchingItem } from './model';

export function updateWatchingList(
  items: WatchingItem[],
  nextItem: WatchingItem,
) {
  const shouldKeep =
    nextItem.collectionStatus != null ||
    nextItem.rating !== undefined ||
    nextItem.watchedEpisodeNumbers.length > 0;

  if (!shouldKeep) {
    return items.filter((item) => item.id !== nextItem.id);
  }

  const exists = items.some((item) => item.id === nextItem.id);

  return exists
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];
}
