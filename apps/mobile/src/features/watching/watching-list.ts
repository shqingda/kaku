import type { WatchingItem } from './model';

export function updateWatchingList(
  items: WatchingItem[],
  nextItem: WatchingItem,
) {
  if (nextItem.watchedEpisodeNumbers.length === 0) {
    return items.filter((item) => item.id !== nextItem.id);
  }

  const exists = items.some((item) => item.id === nextItem.id);

  return exists
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];
}
