import { useEffect, useRef } from 'react';
import { useSubjectComments, useSubjectReviews } from '@/features/reviews/use-subject-reviews';
import { CommentPreviewSection } from './comment-preview-section';
import { ReviewPreviewSection } from './review-preview-section';

export function CommentsPreview({
  onOpenMore,
  refreshToken,
  subjectId,
}: {
  onOpenMore: () => void;
  refreshToken: number;
  subjectId: number;
}) {
  const { data, isError, isPending, refetch } = useSubjectComments(subjectId);
  const appliedRefreshToken = useRef(refreshToken);

  useEffect(() => {
    if (refreshToken === appliedRefreshToken.current) return;
    appliedRefreshToken.current = refreshToken;
    void refetch();
  }, [refetch, refreshToken]);

  const page = data?.pages[0];

  return (
    <CommentPreviewSection
      comments={page?.items.slice(0, 5) ?? []}
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
  const { data, isError, isPending, refetch } = useSubjectReviews(subjectId);
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
      reviews={page?.items.slice(0, 3) ?? []}
      total={page?.total}
    />
  );
}

