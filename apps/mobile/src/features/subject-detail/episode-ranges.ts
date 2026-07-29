export const EPISODES_PER_RANGE = 50;

export function createEpisodeRanges(
  totalEpisodes: number,
  size = EPISODES_PER_RANGE,
) {
  return Array.from(
    { length: Math.ceil(totalEpisodes / size) },
    (_, index) => {
      const start = index * size + 1;
      return {
        end: Math.min(totalEpisodes, start + size - 1),
        start,
      };
    },
  );
}

export function getInitialEpisodeRangeIndex(
  totalEpisodes: number,
  watchedEpisodeNumbers: number[],
  size = EPISODES_PER_RANGE,
) {
  const latestWatched = Math.max(0, ...watchedEpisodeNumbers);
  const nextEpisode = Math.min(
    Math.max(latestWatched + 1, 1),
    Math.max(totalEpisodes, 1),
  );

  return Math.floor((nextEpisode - 1) / size);
}
