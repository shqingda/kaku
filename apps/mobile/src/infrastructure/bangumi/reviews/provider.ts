import type { ReviewsProvider } from '@/features/reviews/model';
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

export const bangumiReviewsProvider: ReviewsProvider = {
  async getComments(subjectId, offset, signal) {
    return mapBangumiComments(
      await getBangumiSubjectComments(subjectId, offset, signal),
      offset,
    );
  },
  async getReviews(subjectId, offset, signal) {
    return mapBangumiReviews(
      await getBangumiSubjectReviews(subjectId, offset, signal),
      offset,
    );
  },
  async getReview(reviewId, signal) {
    const { blog, comments } = await getBangumiReview(reviewId, signal);
    return mapBangumiReviewDetail(
      blog,
      blog.content,
      mapBangumiReplies(comments),
    );
  },
};
