import type { IndexesProvider } from '@/features/indexes/model';

import {
  getBangumiIndex,
  getBangumiIndexRelated,
  getBangumiSubjectIndexes,
} from '../api-next/client';
import {
  toPublicIndexItemPage,
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
    const detail = await getBangumiIndex(indexId);
    const summary = toPublicIndexSummary(detail);

    return {
      ...summary,
      collects: detail.collects,
      description: detail.desc,
      replyCount: detail.replies,
    };
  },
  async getIndexItems(indexId, offset) {
    const limit = 50;
    const page = await getBangumiIndexRelated(indexId, offset, limit);
    return toPublicIndexItemPage(page, offset);
  },
};
