import type { CollectionStatus } from '@/features/watching/model';

export type PersonalCollection = {
  collectionStatus: CollectionStatus;
  comment: string;
  isPrivate: boolean;
  readChapterCount?: number;
  readVolumeCount?: number;
  rating?: number;
  subjectId: number;
  tags: string[];
  watchedEpisodeNumbers: number[];
};

export type PersonalCollectionUpdate = {
  collectionStatus: CollectionStatus | null;
  comment?: string;
  isPrivate?: boolean;
  readChapterCount?: number;
  readVolumeCount?: number;
  rating?: number;
  tags?: string[];
  watchedEpisodeNumbers?: number[];
};
