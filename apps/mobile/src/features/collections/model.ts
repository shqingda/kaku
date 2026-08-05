import type { CollectionStatus } from '@/features/watching/model';

export type PersonalCollection = {
  collectionStatus: CollectionStatus;
  rating?: number;
  subjectId: number;
  watchedEpisodeNumbers: number[];
};

export type PersonalCollectionUpdate = {
  collectionStatus: CollectionStatus | null;
  rating?: number;
  watchedEpisodeNumbers?: number[];
};
