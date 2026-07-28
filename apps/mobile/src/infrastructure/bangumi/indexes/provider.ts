import type {
  IndexesProvider,
  PublicIndexSummary,
} from '@/features/indexes/model';

import {
  getBangumiIndex,
  getBangumiSubjectIndexes,
} from '../api-next/client';
import type { BangumiIndexPage } from '../api-next/schemas';

function toSummary(
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

export const bangumiIndexesProvider: IndexesProvider = {
  async getSubjectIndexes(subjectId) {
    const page = await getBangumiSubjectIndexes(subjectId);

    return {
      items: page.data.map(toSummary),
      total: page.total,
    };
  },
  async getIndex(indexId) {
    const { detail, related } = await getBangumiIndex(indexId);
    const summary = toSummary(detail);

    return {
      ...summary,
      collects: detail.collects,
      description: detail.desc,
      items: related.data.flatMap((relatedItem) => {
        const subject = relatedItem.subject;

        return subject
          ? [
              {
                comment: relatedItem.comment,
                coverUrl:
                  subject.images?.common ??
                  subject.images?.medium ??
                  subject.images?.small,
                id: subject.id,
                score: subject.rating?.score,
                title: subject.nameCN.trim() || subject.name,
              },
            ]
          : [];
      }),
      replyCount: detail.replies,
    };
  },
};
