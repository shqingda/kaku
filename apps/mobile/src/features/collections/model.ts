import type { PersonalCollection, PersonalCollectionUpdate } from '@kaku/shared/collections-contract';
export type { PersonalCollection, PersonalCollectionUpdate };

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
    watchedEpisodeIds: previous?.watchedEpisodeIds ?? [],
    watchedEpisodeNumbers:
      update.watchedEpisodeNumbers ?? previous?.watchedEpisodeNumbers ?? [],
  };
}
