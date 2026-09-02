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
  collectionStatus?: CollectionStatus | null;
  comment?: string;
  isPrivate?: boolean;
  readChapterCount?: number;
  readVolumeCount?: number;
  rating?: number;
  tags?: string[];
  watchedEpisodeNumbers?: number[];
};

// 乐观缓存合并：更新里省略的字段（被编辑器判定为未变化而剔除）保持
// 原值，而不是被清空。收藏状态为空时整条收藏视为不存在。
export function mergePersonalCollection(
  previous: PersonalCollection | null | undefined,
  update: PersonalCollectionUpdate,
  subjectId: number,
): PersonalCollection | null {
  const collectionStatus =
    update.collectionStatus ?? previous?.collectionStatus ?? null;

  if (!collectionStatus) {
    return null;
  }

  return {
    subjectId,
    collectionStatus,
    comment: update.comment ?? previous?.comment ?? '',
    isPrivate: update.isPrivate ?? previous?.isPrivate ?? false,
    readChapterCount: update.readChapterCount ?? previous?.readChapterCount,
    readVolumeCount: update.readVolumeCount ?? previous?.readVolumeCount,
    rating: update.rating ?? previous?.rating,
    tags: update.tags ?? previous?.tags ?? [],
    watchedEpisodeNumbers:
      update.watchedEpisodeNumbers ?? previous?.watchedEpisodeNumbers ?? [],
  };
}
