import type { CollectionStatus } from './model';

export function canRateCollectionStatus(
  collectionStatus?: CollectionStatus | null,
) {
  return collectionStatus != null && collectionStatus !== 'wish';
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
        Number.isFinite(episodeNumber) &&
        episodeNumber > 0 &&
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

  return [...watched].sort((left, right) => left - right).slice(0, nextCount);
}
