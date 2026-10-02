import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { WatchingItem } from '@/features/watching/model';
import { canRateCollectionStatus } from '@/features/watching/progress';
import { collectionBoxDraftFromForm, collectionBoxSessionFromItem, isCollectionBoxFormDirty, type CollectionBoxDraft, type CollectionBoxForm } from './collection-box-draft';

export function useCollectionBoxForm({ item, visible, supportsProgress, onClose, onSave }: {
  item: WatchingItem;
  visible: boolean;
  supportsProgress: boolean;
  onClose: () => void;
  onSave: (draft: CollectionBoxDraft) => void;
}) {
  const [session, setSession] = useState(() =>
    collectionBoxSessionFromItem(item),
  );
  const { baseline, form } = session;
  const { status, tagDraft, tags } = form;
  const subjectType = item.type ?? 2;
  const canEditPersonalData = canRateCollectionStatus(status);
  const supportsReadingProgress =
    item.readChapterCount !== undefined &&
    item.readVolumeCount !== undefined;
  const showsProgress =
    canEditPersonalData && supportsProgress && item.totalEpisodes > 0;
  const showsReadingProgress = canEditPersonalData && supportsReadingProgress;
  const isDirty = isCollectionBoxFormDirty(form, baseline);

  function patchForm(patch: Partial<CollectionBoxForm>) {
    setSession((current) => ({
      ...current,
      form: { ...current.form, ...patch },
    }));
  }

  function requestClose() {
    if (isDirty) {
      Alert.alert(
        '放弃未保存的修改？',
        '收藏盒里的改动还没有保存，关闭后不会保留。',
        [
          { style: 'cancel', text: '继续编辑' },
          { style: 'destructive', text: '放弃修改', onPress: onClose },
        ],
      );
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSession(collectionBoxSessionFromItem(item));
  }, [
    visible,
    item.collectionStatus,
    item.rating,
    item.comment,
    item.isPrivate,
    item.readChapterCount,
    item.readVolumeCount,
    item.tags,
    item.watchedEpisodeNumbers.length,
  ]);

  function save() {
    onSave(collectionBoxDraftFromForm(form, item, showsProgress));
  }

  function addTag() {
    const nextTag = tagDraft.trim();

    if (!nextTag || tags.includes(nextTag)) {
      patchForm({ tagDraft: '' });
      return;
    }

    patchForm({ tagDraft: '', tags: [...tags, nextTag] });
  }

  return { form, patchForm, requestClose, save, addTag, subjectType, canEditPersonalData, supportsReadingProgress, showsProgress, showsReadingProgress };
}
