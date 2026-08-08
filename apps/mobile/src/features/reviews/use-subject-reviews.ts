import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { bangumiReviewsProvider } from '@/infrastructure/bangumi/reviews/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import type {
  SubjectCommentPage,
  SubjectReviewDetail,
  SubjectReviewPage,
} from './model';

export function useSubjectComments(subjectId: number) {
  return useInfiniteQuery<
    SubjectCommentPage,
    Error,
    InfiniteData<SubjectCommentPage>,
    ReturnType<typeof queryKeys.subjectComments>,
    number
  >({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiReviewsProvider.getComments(subjectId, pageParam, signal),
    queryKey: queryKeys.subjectComments(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubjectReviews(subjectId: number) {
  return useInfiniteQuery<
    SubjectReviewPage,
    Error,
    InfiniteData<SubjectReviewPage>,
    ReturnType<typeof queryKeys.subjectReviews>,
    number
  >({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiReviewsProvider.getReviews(subjectId, pageParam, signal),
    queryKey: queryKeys.subjectReviews(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubjectReview(reviewId: number) {
  return useQuery<SubjectReviewDetail>({
    enabled: Number.isInteger(reviewId) && reviewId > 0,
    queryFn: ({ signal }) =>
      bangumiReviewsProvider.getReview(reviewId, signal),
    queryKey: queryKeys.subjectReview(reviewId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
