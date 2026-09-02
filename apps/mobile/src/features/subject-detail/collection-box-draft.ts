import type { PersonalCollectionUpdate } from '../collections/model.ts';
import type {
  CollectionStatus,
  WatchingItem,
} from '../watching/model.ts';
import {
  canRateCollectionStatus,
  resizeWatchedEpisodes,
} from '../watching/progress.ts';
import { getCollectionStatusLabel } from '../catalog/subject-types.ts';

export type CollectionBoxDraft = {
  collectionStatus?: CollectionStatus;
  comment?: string;
  isPrivate?: boolean;
  readChapterCount?: number;
  readVolumeCount?: number;
  rating?: number;
  tags?: string[];
  watchedCount: number;
};

export type CollectionBoxForm = {
  comment: string;
  isPrivate: boolean;
  rating: number | undefined;
  readChapterCount: string;
  readVolumeCount: string;
  status: CollectionStatus | undefined;
  tagDraft: string;
  tags: string[];
  watchedCount: string;
};

export function collectionBoxFormFromItem(
  item: WatchingItem,
): CollectionBoxForm {
  return {
    comment: item.comment ?? '',
    isPrivate: item.isPrivate ?? false,
    rating: item.rating,
    readChapterCount: String(item.readChapterCount ?? 0),
    readVolumeCount: String(item.readVolumeCount ?? 0),
    status: item.collectionStatus ?? undefined,
    tagDraft: '',
    tags: item.tags ?? [],
    watchedCount: String(item.watchedEpisodeNumbers.length),
  };
}

export function collectionBoxBaselineFromItem(
  item: WatchingItem,
): CollectionBoxDraft {
  return {
    collectionStatus: item.collectionStatus ?? undefined,
    comment: item.comment ?? '',
    isPrivate: item.isPrivate ?? false,
    rating: item.rating,
    readChapterCount: item.readChapterCount ?? 0,
    readVolumeCount: item.readVolumeCount ?? 0,
    tags: item.tags ?? [],
    watchedCount: item.watchedEpisodeNumbers.length,
  };
}

export type CollectionBoxSession = {
  baseline: CollectionBoxDraft;
  form: CollectionBoxForm;
};

export function collectionBoxSessionFromItem(
  item: WatchingItem,
): CollectionBoxSession {
  return {
    baseline: collectionBoxBaselineFromItem(item),
    form: collectionBoxFormFromItem(item),
  };
}

export function isCollectionBoxFormDirty(
  form: CollectionBoxForm,
  baseline: CollectionBoxDraft,
) {
  return (
    form.status !== baseline.collectionStatus ||
    Number(form.watchedCount) !== baseline.watchedCount ||
    form.rating !== baseline.rating ||
    form.comment !== baseline.comment ||
    form.isPrivate !== baseline.isPrivate ||
    Number(form.readChapterCount) !== baseline.readChapterCount ||
    Number(form.readVolumeCount) !== baseline.readVolumeCount ||
    form.tagDraft.trim().length > 0 ||
    tagsDiffer(form.tags, baseline.tags ?? [])
  );
}

export function collectionBoxDraftFromForm(
  form: CollectionBoxForm,
  item: WatchingItem,
  showsProgress: boolean,
): CollectionBoxDraft {
  const parsedCount = Number(form.watchedCount);
  const parsedChapterCount = Number(form.readChapterCount);
  const parsedVolumeCount = Number(form.readVolumeCount);
  const pendingTag = form.tagDraft.trim();
  const nextTags =
    item.tags !== undefined && pendingTag && !form.tags.includes(pendingTag)
      ? [...form.tags, pendingTag]
      : form.tags;

  return {
    collectionStatus: form.status,
    comment: item.comment !== undefined ? form.comment.trim() : undefined,
    isPrivate: item.isPrivate !== undefined ? form.isPrivate : undefined,
    readChapterCount:
      item.readChapterCount !== undefined &&
      Number.isInteger(parsedChapterCount)
        ? Math.max(parsedChapterCount, 0)
        : undefined,
    readVolumeCount:
      item.readVolumeCount !== undefined &&
      Number.isInteger(parsedVolumeCount)
        ? Math.max(parsedVolumeCount, 0)
        : undefined,
    rating: canRateCollectionStatus(form.status) ? form.rating : undefined,
    tags: item.tags !== undefined ? nextTags : undefined,
    watchedCount:
      showsProgress && Number.isInteger(parsedCount)
        ? Math.min(Math.max(parsedCount, 0), item.totalEpisodes)
        : 0,
  };
}

export type CollectionBoxCapabilities = {
  supportsWatchProgress: boolean;
  supportsReadingProgress: boolean;
};

// Bangumi v0 API 对携带 type/rate/进度字段的每次 PUT 都会生成时间线事件，
// 而官网只在真正变化时才发。这里把草稿映射成更新字段，并剔除与当前收藏
// 相同的字段，让纯吐槽/标签/可见范围编辑和私有公开切换保持安静。
export function collectionBoxUpdateFromDraft(
  draft: CollectionBoxDraft,
  item: WatchingItem,
  capabilities: CollectionBoxCapabilities,
): PersonalCollectionUpdate {
  const isActive = canRateCollectionStatus(draft.collectionStatus);

  return omitUnchanged(
    {
      collectionStatus: draft.collectionStatus ?? null,
      comment: draft.comment,
      isPrivate: draft.isPrivate,
      rating: isActive ? draft.rating : undefined,
      readChapterCount: recordProgressCount(
        capabilities.supportsReadingProgress,
        isActive,
        draft.readChapterCount,
      ),
      readVolumeCount: recordProgressCount(
        capabilities.supportsReadingProgress,
        isActive,
        draft.readVolumeCount,
      ),
      tags: draft.tags,
      watchedEpisodeNumbers: recordWatchedEpisodes(
        capabilities.supportsWatchProgress,
        isActive,
        draft,
        item,
      ),
    },
    item,
  );
}

function recordProgressCount(
  supported: boolean,
  isActive: boolean,
  count: number | undefined,
) {
  if (!supported) {
    return undefined;
  }

  return isActive ? count : 0;
}

function recordWatchedEpisodes(
  supported: boolean,
  isActive: boolean,
  draft: CollectionBoxDraft,
  item: WatchingItem,
) {
  if (!supported) {
    return undefined;
  }

  return isActive
    ? resizeWatchedEpisodes(
        item.watchedEpisodeNumbers,
        draft.watchedCount,
        item.totalEpisodes,
      )
    : [];
}

function omitUnchanged(
  update: PersonalCollectionUpdate,
  item: WatchingItem,
): PersonalCollectionUpdate {
  const result = { ...update };

  if (
    (result.collectionStatus ?? null) === (item.collectionStatus ?? null)
  ) {
    delete result.collectionStatus;
  }
  if (result.rating !== undefined && result.rating === item.rating) {
    delete result.rating;
  }
  if (
    result.readChapterCount !== undefined &&
    result.readChapterCount === (item.readChapterCount ?? 0)
  ) {
    delete result.readChapterCount;
  }
  if (
    result.readVolumeCount !== undefined &&
    result.readVolumeCount === (item.readVolumeCount ?? 0)
  ) {
    delete result.readVolumeCount;
  }
  if (
    result.watchedEpisodeNumbers &&
    sameWatchedEpisodes(
      result.watchedEpisodeNumbers,
      item.watchedEpisodeNumbers,
    )
  ) {
    delete result.watchedEpisodeNumbers;
  }

  return result;
}

export function collectionInactiveNotice(
  status: CollectionStatus | undefined,
  subjectType: number,
  supportsWatchProgress: boolean,
  supportsReadingProgress: boolean,
): string {
  const recordables = [
    ...(supportsWatchProgress ? ['观看进度'] : []),
    ...(supportsReadingProgress ? ['阅读进度'] : []),
    '评分',
  ];

  if (status) {
    return `${getCollectionStatusLabel(subjectType, status)}状态不记录${joinChinese(recordables)}`;
  }

  return `选择收藏状态后可记录${joinChinese(recordables)}`;
}

function joinChinese(items: string[]) {
  if (items.length <= 1) {
    return items.join('');
  }

  return `${items.slice(0, -1).join('、')}和${items[items.length - 1]}`;
}

function tagsDiffer(current: string[], expected: string[]) {
  if (current.length !== expected.length) {
    return true;
  }

  return current.some((tag, index) => tag !== expected[index]);
}

function sameWatchedEpisodes(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}
