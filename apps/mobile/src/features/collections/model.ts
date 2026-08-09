import type { CollectionStatus } from '@/features/watching/model';

export type PersonalCollection = {
  collectionStatus: CollectionStatus;
  comment: string;
  isPrivate: boolean;
  rating?: number;
  subjectId: number;
  tags: string[];
  watchedEpisodeNumbers: number[];
};

export type PersonalCollectionUpdate = {
  collectionStatus: CollectionStatus | null;
  comment?: string;
  isPrivate?: boolean;
  rating?: number;
  tags?: string[];
  watchedEpisodeNumbers?: number[];
};
