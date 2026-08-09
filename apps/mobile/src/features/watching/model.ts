export type CollectionStatus =
  | 'wish'
  | 'completed'
  | 'doing'
  | 'onHold'
  | 'dropped';

export type WatchingItem = {
  collectionStatus?: CollectionStatus | null;
  comment?: string;
  id: number;
  isPrivate?: boolean;
  readChapterCount?: number;
  readVolumeCount?: number;
  title: string;
  coverUrl: string;
  rating?: number;
  tags?: string[];
  watchedEpisodeNumbers: number[];
  totalEpisodes: number;
  year: number;
  summary: string;
  episodeAirDates: string[];
  type?: number;
};
