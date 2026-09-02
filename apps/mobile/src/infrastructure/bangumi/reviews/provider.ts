import type {
  SubjectCommentPage,
  SubjectReviewDetail,
  SubjectReviewPage,
} from '@/features/reviews/model';
import {
  mapBangumiReplies,
} from '../discussions/adapter';

import {
  getBangumiReview,
  getBangumiSubjectComments,
  getBangumiSubjectReviews,
} from '../api-next/client';
import {
  mapBangumiComments,
  mapBangumiReviewDetail,
  mapBangumiReviews,
} from './adapter';

export async function getSubjectComments(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
): Promise<SubjectCommentPage> {
  return mapBangumiComments(
    await getBangumiSubjectComments(subjectId, offset, signal),
    offset,
  );
}

export async function getSubjectReviews(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
): Promise<SubjectReviewPage> {
  return mapBangumiReviews(
    await getBangumiSubjectReviews(subjectId, offset, signal),
    offset,
  );
}

export async function getSubjectReview(
  reviewId: number,
  signal?: AbortSignal,
): Promise<SubjectReviewDetail> {
  const { blog, comments } = await getBangumiReview(reviewId, signal);
  return mapBangumiReviewDetail(
    blog,
    blog.content,
    mapBangumiReplies(comments),
  );
}
