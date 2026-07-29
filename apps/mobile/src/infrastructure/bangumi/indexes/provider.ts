import type { IndexesProvider } from '@/features/indexes/model';

import {
  getBangumiIndex,
  getBangumiSubjectIndexes,
} from '../api-next/client';
import {
  toPublicIndexPage,
  toPublicIndexSummary,
} from './adapter';

export const bangumiIndexesProvider: IndexesProvider = {
  async getSubjectIndexes(subjectId, offset) {
    const limit = 30;
    const page = await getBangumiSubjectIndexes(
      subjectId,
      offset,
      limit,
    );
    return toPublicIndexPage(page, offset, limit);
  },
  async getIndex(indexId) {
    const { detail, related } = await getBangumiIndex(indexId);
    const summary = toPublicIndexSummary(detail);

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
