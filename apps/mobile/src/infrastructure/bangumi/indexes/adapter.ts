import type {
  PublicIndexPage,
  PublicIndexSummary,
} from '../../../features/indexes/model.ts';
import type { BangumiIndexPage } from '../api-next/schemas.ts';

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
