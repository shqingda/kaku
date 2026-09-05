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

export function applyQuickProgress(collection: PersonalCollection | null, episode: number, undo: boolean) {
  if (collection?.collectionStatus !== 'doing') throw new Error('收藏状态已变化，请进入章节页确认');
  const watched = new Set(collection.watchedEpisodeNumbers);
  if (!undo && watched.has(episode)) throw new Error('本集已被标记，请刷新进度');
  if (undo) watched.delete(episode);
  else watched.add(episode);
  return { watchedEpisodeNumbers: [...watched].sort((a, b) => a - b) };
}
