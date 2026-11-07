import { useEffect, useRef } from 'react';
import { useSubjectComments, useSubjectReviews } from '@/features/reviews/use-subject-reviews';
import { withoutBlockedAuthors } from '@/features/users/blocked-content';
import { useBlockedUserIds } from '@/features/users/use-blocklist';
import { CommentPreviewSection } from './comment-preview-section';
import { ReviewPreviewSection } from './review-preview-section';
import { loadStatus } from '@/lib/query-status';

export function CommentsPreview({
  onOpenMore,
  refreshToken,
  subjectId,
}: {
  onOpenMore: () => void;
  refreshToken: number;
  subjectId: number;
}) {
  const commentsQuery = useSubjectComments(subjectId);
  const { data, refetch } = commentsQuery;
  const { isError, isPending } = loadStatus(commentsQuery);
  const blockedIds = useBlockedUserIds();
  const appliedRefreshToken = useRef(refreshToken);

  useEffect(() => {
    if (refreshToken === appliedRefreshToken.current) return;
    appliedRefreshToken.current = refreshToken;
    void refetch();
  }, [refetch, refreshToken]);

  const page = data?.pages[0];

  return (
    <CommentPreviewSection
      comments={withoutBlockedAuthors(page?.items ?? [], blockedIds).slice(0, 5)}
      isError={isError}
      isPending={isPending}
      onOpenMore={onOpenMore}
      onRetry={() => void refetch()}
      total={page?.total}
    />
  );
}

export function ReviewsPreview({
  onOpenMore,
  onOpenReview,
  refreshToken,
  subjectId,
}: {
  onOpenMore: () => void;
  onOpenReview: (review: { id: string }) => void;
  refreshToken: number;
  subjectId: number;
}) {
  const reviewsQuery = useSubjectReviews(subjectId);
  const { data, refetch } = reviewsQuery;
  const { isError, isPending } = loadStatus(reviewsQuery);
  const blockedIds = useBlockedUserIds();
  const appliedRefreshToken = useRef(refreshToken);

  useEffect(() => {
    if (refreshToken === appliedRefreshToken.current) return;
    appliedRefreshToken.current = refreshToken;
    void refetch();
  }, [refetch, refreshToken]);

  const page = data?.pages[0];

  return (
    <ReviewPreviewSection
      isError={isError}
      isPending={isPending}
      onOpenMore={onOpenMore}
      onOpenReview={onOpenReview}
      onRetry={() => void refetch()}
      reviews={withoutBlockedAuthors(page?.items ?? [], blockedIds).slice(0, 3)}
      total={page?.total}
    />
  );
}

