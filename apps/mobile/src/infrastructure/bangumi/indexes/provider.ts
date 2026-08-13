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
  async getSubjectIndexes(subjectId, offset, signal) {
    const limit = 30;
    const page = await getBangumiSubjectIndexes(
      subjectId,
      offset,
      limit,
      signal,
    );
    return toPublicIndexPage(page, offset, limit);
  },
  async getIndex(indexId, signal) {
    const detail = await getBangumiIndex(indexId, signal);
    const summary = toPublicIndexSummary(detail);

    return {
      ...summary,
      collects: detail.collects,
      description: detail.desc,
      isPrivate: detail.private,
      replyCount: detail.replies,
    };
  },
  async getIndexItems(indexId, offset, signal) {
    const limit = 50;
    const page = await getBangumiIndexRelated(
      indexId,
      offset,
      limit,
      signal,
    );
    return toPublicIndexItemPage(page, offset);
  },
};
