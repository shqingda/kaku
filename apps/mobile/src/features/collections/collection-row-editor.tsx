import { useAuth } from '@/features/auth/auth-provider';
import { usePersonalCollection, useSavePersonalCollection } from './use-personal-collection';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import type { PublicUserCollection } from '@/features/users/model';
import type { WatchingItem } from '@/features/watching/model';

export function CollectionRowEditor({ item }: { item: PublicUserCollection }) {
  const { session } = useAuth();
  const saveCollection = useSavePersonalCollection(item.id);
  // 公开行没有吐槽/标签/可见范围，编辑时以个人收藏为准补齐，
  // 让抽屉与条目详情页的编辑面板保持同一套字段。
  const personalQuery = usePersonalCollection(item.id);
  const personal = personalQuery.data;
  const watchingItem: WatchingItem = {
    collectionStatus: personal?.collectionStatus ?? item.collectionStatus,
    comment: session ? personal?.comment ?? '' : undefined,
    coverUrl: item.coverUrl ?? '',
    episodeAirDates: [],
    id: item.id,
    isPrivate: session ? personal?.isPrivate ?? false : undefined,
    rating: personal?.rating ?? item.rate,
    readChapterCount:
      item.subjectType === 1
        ? personal?.readChapterCount ?? item.progress
        : undefined,
    readVolumeCount:
      item.subjectType === 1
        ? personal?.readVolumeCount ?? item.volumeProgress
        : undefined,
    summary: '',
    tags: session ? personal?.tags ?? [] : undefined,
    title: item.title,
    totalEpisodes: item.totalEpisodes,
    type: item.subjectType,
    watchedEpisodeNumbers:
      personal?.watchedEpisodeNumbers ??
      Array.from({ length: item.progress }, (_, index) => index + 1),
    year: 0,
  };

  return (
    <CollectionControls
      item={watchingItem}
      onSave={(update) =>
        saveCollection.mutateAsync(update).then(() => undefined)
      }
      variant="compact"
    />
  );
}

