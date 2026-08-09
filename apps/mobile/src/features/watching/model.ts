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
  title: string;
  coverUrl: string;
  rating?: number;
  watchedEpisodeNumbers: number[];
  totalEpisodes: number;
  year: number;
  summary: string;
  episodeAirDates: string[];
  type?: number;
};
