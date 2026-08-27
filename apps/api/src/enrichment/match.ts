import { catalogTitlesMatch } from '@kaku/shared';

export type EnrichmentTitles = {
  originalTitle: string;
  title: string;
};

export type ForeignMediaTitles = {
  english?: string;
  native?: string;
  romaji?: string;
  userPreferred?: string;
};

export function pickExactTitleMatch<T extends ForeignMediaTitles>(
  subject: EnrichmentTitles,
  candidates: T[],
): T | undefined {
  const localTitles = [subject.title, subject.originalTitle].filter(
    (value) => value.trim().length > 0,
  );

  return candidates.find((candidate) => {
    const remoteTitles = [
      candidate.native,
      candidate.romaji,
      candidate.english,
      candidate.userPreferred,
    ].filter((value): value is string => Boolean(value));

    return remoteTitles.some((remote) =>
      localTitles.some((local) => catalogTitlesMatch(local, remote)),
    );
  });
}
