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
