import type {
  PublicIndexItem,
  PublicIndexItemPage,
  PublicIndexPage,
  PublicIndexSummary,
} from '../../../features/indexes/model.ts';
import type {
  BangumiIndexPage,
  BangumiIndexRelated,
} from '../api-next/schemas.ts';

export function toPublicIndexSummary(
  index: BangumiIndexPage['data'][number],
): PublicIndexSummary {
  return {
    author:
      index.user?.nickname || index.user?.username || '未知用户',
    authorUsername: index.user?.username,
    id: index.id,
    itemCount: index.total,
    title: index.title,
    updatedAt: index.updatedAt,
  };
}

export function toPublicIndexPage(
  page: BangumiIndexPage,
  offset: number,
  limit: number,
): PublicIndexPage {
  const nextOffset = offset + limit;

  return {
    items: page.data.map(toPublicIndexSummary),
    nextOffset:
      page.data.length > 0 && nextOffset < page.total
        ? nextOffset
        : undefined,
    total: page.total,
  };
}

function toPublicIndexItem(
  relatedItem: BangumiIndexRelated['data'][number],
): PublicIndexItem | undefined {
  const subject = relatedItem.subject;

  return subject
    ? {
        comment: relatedItem.comment,
        coverUrl:
          subject.images?.common ??
          subject.images?.medium ??
          subject.images?.small,
        id: subject.id,
        score: subject.rating?.score,
        title: subject.nameCN.trim() || subject.name,
      }
    : undefined;
}

export function toPublicIndexItemPage(
  page: BangumiIndexRelated,
  offset: number,
): PublicIndexItemPage {
  const nextOffset = offset + page.data.length;

  return {
    items: page.data
      .map(toPublicIndexItem)
      .filter((item): item is PublicIndexItem => item !== undefined),
    nextOffset:
      page.data.length > 0 && nextOffset < page.total
        ? nextOffset
        : undefined,
    total: page.total,
  };
}
