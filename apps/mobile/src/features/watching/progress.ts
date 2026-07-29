import type { CollectionStatus, WatchingItem } from './model';

export function canRateCollectionStatus(
  collectionStatus?: CollectionStatus | null,
) {
  return collectionStatus != null && collectionStatus !== 'wish';
}

export function shouldShowWatchProgress({
  collectionStatus,
  totalEpisodes,
  watchedCount,
}: {
  collectionStatus?: CollectionStatus | null;
  totalEpisodes: number;
  watchedCount: number;
}) {
  if (totalEpisodes <= 0 || collectionStatus === 'wish') {
    return false;
  }

  return (
    watchedCount > 0 ||
    collectionStatus === 'completed' ||
    collectionStatus === 'doing' ||
    collectionStatus === 'onHold' ||
    collectionStatus === 'dropped'
  );
}

export function resizeWatchedEpisodes(
  watchedEpisodeNumbers: number[],
  watchedCount: number,
  totalEpisodes: number,
) {
  const safeTotal = Math.max(Math.trunc(totalEpisodes), 0);
  const nextCount = Math.min(
    Math.max(Math.trunc(watchedCount), 0),
    safeTotal,
  );
  const watched = new Set(
    watchedEpisodeNumbers.filter(
      (episodeNumber) =>
        Number.isInteger(episodeNumber) &&
        episodeNumber >= 1 &&
        episodeNumber <= safeTotal,
    ),
  );

  for (
    let episodeNumber = 1;
    watched.size < nextCount && episodeNumber <= safeTotal;
    episodeNumber += 1
  ) {
    watched.add(episodeNumber);
  }

  for (
    let episodeNumber = safeTotal;
    watched.size > nextCount && episodeNumber >= 1;
    episodeNumber -= 1
  ) {
    watched.delete(episodeNumber);
  }

  return [...watched].sort((left, right) => left - right);
}

export function changeCollectionStatus(
  item: WatchingItem,
  collectionStatus?: CollectionStatus,
) {
  const clearsPersonalData =
    collectionStatus === 'wish' || collectionStatus === undefined;

  return {
    ...item,
    collectionStatus: collectionStatus ?? null,
    rating: clearsPersonalData ? undefined : item.rating,
    watchedEpisodeNumbers:
      clearsPersonalData ? [] : item.watchedEpisodeNumbers,
  };
}

export function changeRating(item: WatchingItem, rating?: number) {
  return {
    ...item,
    rating: canRateCollectionStatus(item.collectionStatus)
      ? rating
      : undefined,
  };
}

export function changeWatchedEpisodeCount(
  item: WatchingItem,
  watchedCount: number,
) {
  const watchedEpisodeNumbers = resizeWatchedEpisodes(
    item.watchedEpisodeNumbers,
    watchedCount,
    item.totalEpisodes,
  );
  const shouldStartWatching =
    watchedEpisodeNumbers.length > 0 &&
    (item.collectionStatus == null || item.collectionStatus === 'wish');

  return {
    ...item,
    collectionStatus: shouldStartWatching
      ? ('doing' as const)
      : item.collectionStatus ?? null,
    watchedEpisodeNumbers,
  };
}

export function toggleWatchedEpisode(
  item: WatchingItem,
  episodeNumber: number,
) {
  const isWatched = item.watchedEpisodeNumbers.includes(episodeNumber);
  const watchedEpisodeNumbers = isWatched
    ? item.watchedEpisodeNumbers.filter((number) => number !== episodeNumber)
    : [...item.watchedEpisodeNumbers, episodeNumber].sort(
        (left, right) => left - right,
      );
  const shouldStartWatching =
    !isWatched &&
    (item.collectionStatus == null || item.collectionStatus === 'wish');

  return {
    ...item,
    collectionStatus: shouldStartWatching
      ? ('doing' as const)
      : item.collectionStatus ?? null,
    watchedEpisodeNumbers,
  };
}
