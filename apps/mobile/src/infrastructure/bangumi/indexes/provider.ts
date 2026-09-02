import type {
  PublicIndexDetail,
  PublicIndexItemPage,
  PublicIndexPage,
} from '@/features/indexes/model';

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

export async function getSubjectIndexes(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
): Promise<PublicIndexPage> {
  const limit = 30;
  const page = await getBangumiSubjectIndexes(
    subjectId,
    offset,
    limit,
    signal,
  );
  return toPublicIndexPage(page, offset, limit);
}

export async function getPublicIndex(
  indexId: number,
  signal?: AbortSignal,
): Promise<PublicIndexDetail> {
  const detail = await getBangumiIndex(indexId, signal);
  const summary = toPublicIndexSummary(detail);

  return {
    ...summary,
    collects: detail.collects,
    description: detail.desc,
    isPrivate: detail.private,
    replyCount: detail.replies,
  };
}

export async function getPublicIndexItems(
  indexId: number,
  offset: number,
  signal?: AbortSignal,
): Promise<PublicIndexItemPage> {
  const limit = 50;
  const page = await getBangumiIndexRelated(
    indexId,
    offset,
    limit,
    signal,
  );
  return toPublicIndexItemPage(page, offset);
}
