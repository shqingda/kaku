import type { CatalogSubject } from '../catalog/model.ts';
import type { PersonalCollection } from '../collections/model.ts';
import type { WatchingItem } from '../watching/model.ts';

export const EMPTY_SUMMARY = '暂无简介';

// Personal fields stay undefined when signed out, so the collection controls can
// tell "not signed in" apart from "signed in with nothing recorded".
export function toProgressSubject(
  subject: CatalogSubject,
  collection: PersonalCollection | null | undefined,
  {
    collectionLoaded,
    signedIn,
    subjectId,
  }: { collectionLoaded: boolean; signedIn: boolean; subjectId: number },
): WatchingItem {
  const isBook = subject.type === 1;
  return {
    collectionStatus: collection?.collectionStatus ?? null,
    comment: signedIn ? collection?.comment ?? '' : undefined,
    coverUrl: subject.coverUrl ?? '',
    episodeAirDates: subject.episodes.map((episode) => episode.airDate ?? ''),
    // The route id, which can differ from subject.id when Bangumi merged entries.
    id: subjectId,
    isPrivate: signedIn ? collection?.isPrivate ?? false : undefined,
    readChapterCount: signedIn && isBook ? collection?.readChapterCount ?? 0 : undefined,
    readVolumeCount: signedIn && isBook ? collection?.readVolumeCount ?? 0 : undefined,
    rating: collection?.rating,
    summary: subject.summary || EMPTY_SUMMARY,
    tags: signedIn ? collection?.tags ?? [] : undefined,
    title: subject.title,
    totalEpisodes: subject.totalEpisodes,
    type: subject.type,
    watchedEpisodeNumbers: collection?.watchedEpisodeNumbers ?? [],
    // An empty list only once Bangumi confirmed there is no collection yet.
    watchedEpisodeIds:
      collection?.watchedEpisodeIds ?? (collectionLoaded && collection === null ? [] : undefined),
    year: subject.year ?? 0,
  };
}
