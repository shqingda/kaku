import type { ReviewsProvider } from '@/features/reviews/model';
import {
  cleanBangumiContent,
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
  async getComments(subjectId, offset) {
    return mapBangumiComments(
      await getBangumiSubjectComments(subjectId, offset),
      offset,
    );
  },
  async getReviews(subjectId, offset) {
    return mapBangumiReviews(
      await getBangumiSubjectReviews(subjectId, offset),
      offset,
    );
  },
  async getReview(reviewId) {
    const { blog, comments } = await getBangumiReview(reviewId);
    return mapBangumiReviewDetail(
      blog,
      cleanBangumiContent(blog.content),
      mapBangumiReplies(comments),
    );
  },
};
