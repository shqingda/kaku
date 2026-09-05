import type { CatalogSubject } from '../catalog/model';
import type { PersonalCollection } from '../collections/model';

export function nextTrackingEpisode(subject: CatalogSubject, collection: PersonalCollection | null, today = new Date().toISOString().slice(0, 10)) {
  if (![2, 6].includes(subject.type) || subject.offlineSource || collection?.collectionStatus !== 'doing') return null;
  const episodes = [...subject.episodes].sort((a, b) => a.number - b.number);
  // Catalog adapter supplies only main episodes. Incomplete/special numbering is
  // deliberately left to the full chapter picker instead of guessing from count.
  if (!episodes.length || episodes.length !== subject.totalEpisodes || episodes.some((episode, index) => episode.number !== index + 1)) return null;
  const watched = [...new Set(collection.watchedEpisodeNumbers)].sort((a, b) => a - b);
  if (watched.some((number, index) => number !== index + 1)) return null;
  const next = episodes[watched.length];
  return next && (!next.airDate || next.airDate <= today) ? next : null;
}

export function quickProgressAction(
  subject: CatalogSubject,
  collection: PersonalCollection | null,
  today = new Date().toISOString().slice(0, 10),
) {
  const next = nextTrackingEpisode(subject, collection, today);
  if (next) return { kind: 'mark' as const, episode: next.number };
  const watched = [...new Set(collection?.watchedEpisodeNumbers ?? [])].sort((a, b) => a - b);
  if (
    collection?.collectionStatus === 'doing' &&
    !subject.offlineSource &&
    [2, 6].includes(subject.type) &&
    subject.totalEpisodes > 0 &&
    subject.episodes.length === subject.totalEpisodes &&
    watched.length === subject.totalEpisodes &&
    watched.every((number, index) => number === index + 1)
  ) {
    return { kind: 'caughtUp' as const };
  }
  return { kind: 'pick' as const };
}

export function applyQuickProgress(collection: PersonalCollection | null, episode: number, undo: boolean) {
  if (collection?.collectionStatus !== 'doing') throw new Error('收藏状态已变化，请到条目里勾选已看集数');
  const watched = new Set(collection.watchedEpisodeNumbers);
  if (!undo && watched.has(episode)) throw new Error('本集已被标记，请刷新进度');
  if (undo) watched.delete(episode);
  else watched.add(episode);
  return { watchedEpisodeNumbers: [...watched].sort((a, b) => a - b) };
}
