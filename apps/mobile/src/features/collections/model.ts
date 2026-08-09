import type { CollectionStatus } from '@/features/watching/model';

export type PersonalCollection = {
  collectionStatus: CollectionStatus;
  comment: string;
  rating?: number;
  subjectId: number;
  watchedEpisodeNumbers: number[];
};

export type PersonalCollectionUpdate = {
  collectionStatus: CollectionStatus | null;
  comment?: string;
  rating?: number;
  watchedEpisodeNumbers?: number[];
};
