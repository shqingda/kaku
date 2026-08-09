export type CollectionStatus =
  | 'wish'
  | 'completed'
  | 'doing'
  | 'onHold'
  | 'dropped';

export type PersonalCollection = {
  collectionStatus: CollectionStatus;
  comment: string;
  rating?: number;
  subjectId: number;
  watchedEpisodeNumbers: number[];
};

export const collectionStatusToBangumiType: Record<CollectionStatus, number> = {
  completed: 2,
  doing: 3,
  dropped: 5,
  onHold: 4,
  wish: 1,
};

export const bangumiTypeToCollectionStatus: Record<number, CollectionStatus> = {
  1: 'wish',
  2: 'completed',
  3: 'doing',
  4: 'onHold',
  5: 'dropped',
};
