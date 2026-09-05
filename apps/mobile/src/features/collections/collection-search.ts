import { isCollectionStatus } from '@kaku/shared';

import type { PersonalCollection } from './model';
import type { PublicUserCollection, PublicUserCollectionPage } from '../users/model';
import type { CollectionStatus } from '../watching/model';

// 0 是「全部」；1/2/3/4/6 与 Bangumi 条目类型（书籍/动画/音乐/游戏/三次元）一致。
const SUBJECT_TYPE_IDS = new Set([0, 1, 2, 3, 4, 6]);

export type CollectionSearchPreferences = {
  keyword: string;
  subjectType: number;
  status?: CollectionStatus;
};

export const DEFAULT_COLLECTION_SEARCH: CollectionSearchPreferences = {
  keyword: '',
  subjectType: 0,
};

export const collectionSearchStorageKey = (userId: number) =>
  `kaku:collection-search:v1:${userId}`;

export function parseCollectionSearch(
  raw: string | null,
): CollectionSearchPreferences {
  if (!raw) return DEFAULT_COLLECTION_SEARCH;
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('invalid preferences');
  return {
    keyword: typeof value.keyword === 'string' ? value.keyword : '',
    subjectType: SUBJECT_TYPE_IDS.has(value.subjectType) ? value.subjectType : 0,
    status: isCollectionStatus(value.status) ? value.status : undefined,
  };
}

export function collectSearchPages(pages: PublicUserCollectionPage[]) {
  const items = [
    ...new Map(
      pages.flatMap((page) => page.items).map((item) => [item.id, item]),
    ).values(),
  ];
  const total = pages.at(-1)?.total ?? 0;
  const complete =
    pages.length > 0 &&
    pages.at(-1)?.nextOffset === undefined &&
    items.length === total;
  return { items, total, complete };
}

export function searchCollections(
  items: PublicUserCollection[],
  preferences: CollectionSearchPreferences,
) {
  const keyword = preferences.keyword.trim().normalize('NFKC').toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        (!preferences.subjectType || item.subjectType === preferences.subjectType) &&
        (!preferences.status || item.collectionStatus === preferences.status) &&
        (!keyword ||
          [item.title, item.originalTitle ?? ''].some((name) =>
            name.normalize('NFKC').toLocaleLowerCase().includes(keyword),
          )),
    )
    .sort(
      (left, right) =>
        (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0) ||
        left.id - right.id,
    );
}

export function listItemFromPersonalCollection(
  item: PublicUserCollection,
  collection: PersonalCollection,
  updatedAt: string,
): PublicUserCollection {
  return {
    ...item,
    collectionStatus: collection.collectionStatus,
    progress:
      item.subjectType === 1
        ? (collection.readChapterCount ?? item.progress)
        : collection.watchedEpisodeNumbers.length,
    rate: collection.rating,
    updatedAt,
    volumeProgress:
      item.subjectType === 1
        ? (collection.readVolumeCount ?? item.volumeProgress)
        : item.volumeProgress,
  };
}

export type MyCollectionEmpty = {
  kind: 'offline' | 'loading' | 'error' | 'no-match';
  text: string;
  title: string;
};

export type MyCollectionView = {
  empty: MyCollectionEmpty | null;
  showErrorBanner: boolean;
  showStaleRefresh: boolean;
  subtitle: string;
};

export function describeMyCollectionLoad(input: {
  complete: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  loaded: number;
  matched: number;
  paused: boolean;
  searching: boolean;
  total: number;
}): MyCollectionView {
  const idle = { showErrorBanner: false, showStaleRefresh: false };
  const stale =
    input.searching &&
    !input.complete &&
    !input.hasNextPage &&
    !input.isPending &&
    !input.isFetching &&
    !input.isError;

  if (input.loaded === 0) {
    if (input.paused) {
      return {
        empty: {
          kind: 'offline',
          text: input.searching
            ? '恢复联网后继续读取完整收藏。'
            : '恢复联网后继续读取收藏。',
          title: '当前离线',
        },
        subtitle: '当前离线，恢复联网后继续读取',
        ...idle,
      };
    }
    if (input.isPending) {
      return {
        empty: {
          kind: 'loading',
          text: input.searching
            ? '正在读取完整收藏，搜索会覆盖全部条目。'
            : '正在读取收藏。',
          title: '收藏加载中',
        },
        subtitle: input.searching ? '正在读取完整收藏' : '正在读取收藏',
        ...idle,
      };
    }
    if (input.isError) {
      return {
        empty: {
          kind: 'error',
          text: '请检查网络后重试，已加载的数据不会被覆盖。',
          title: '收藏读取失败',
        },
        subtitle: '收藏读取失败，当前结果可能不完整',
        ...idle,
      };
    }
  }

  if (input.paused) {
    return {
      empty: null,
      subtitle: '当前离线，恢复联网后继续读取',
      ...idle,
    };
  }

  if (input.isError) {
    return {
      empty: null,
      showErrorBanner: true,
      showStaleRefresh: false,
      subtitle: '收藏读取失败，当前结果可能不完整',
    };
  }

  if (stale) {
    return {
      empty: null,
      showErrorBanner: false,
      showStaleRefresh: true,
      subtitle: '收藏发生变化，请刷新以取得完整结果',
    };
  }

  if (input.searching && !input.complete) {
    return {
      empty: null,
      subtitle: `已读取 ${input.loaded}/${input.total || '…'} 项，搜索结果尚不完整`,
      ...idle,
    };
  }

  return {
    empty:
      input.matched === 0
        ? {
            kind: 'no-match',
            text: input.searching
              ? '可以换个名称或减少筛选条件。'
              : '没有符合当前筛选的收藏。',
            title: input.searching ? '没有匹配的收藏' : '暂无收藏',
          }
        : null,
    subtitle:
      input.searching && input.matched !== input.total
        ? `${input.total} 个条目 · 找到 ${input.matched} 项`
        : `${input.total} 个条目`,
    ...idle,
  };
}
