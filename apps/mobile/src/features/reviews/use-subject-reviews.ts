import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import {
  getSubjectComments,
  getSubjectReview,
  getSubjectReviews,
} from '@/infrastructure/bangumi/reviews/provider';
import { useSessionAwareQuery } from '@/features/auth/session-aware-query';
import {
  cleanBangumiContent,
  mapBangumiReplies,
} from '@/infrastructure/bangumi/discussions/adapter';
import { mapBangumiReviewDetail } from '@/infrastructure/bangumi/reviews/adapter';
import { getAuthenticatedReview } from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
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
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getSubjectComments(subjectId, pageParam, signal),
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
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getSubjectReviews(subjectId, pageParam, signal),
    queryKey: queryKeys.subjectReviews(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubjectReview(reviewId: number) {
  const { queryFn, meta, suffix } = useSessionAwareQuery({
    public: (signal) => getSubjectReview(reviewId, signal),
    authenticated: async (request, signal) => {
      const { blog, comments } = await getAuthenticatedReview(
        request,
        reviewId,
        signal,
      );
      return mapBangumiReviewDetail(
        blog,
        cleanBangumiContent(blog.content),
        mapBangumiReplies(comments),
      );
    },
  });

  return useQuery<SubjectReviewDetail>({
    enabled: Number.isInteger(reviewId) && reviewId > 0,
    queryFn,
    queryKey: [...queryKeys.subjectReview(reviewId), suffix],
    meta,
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
