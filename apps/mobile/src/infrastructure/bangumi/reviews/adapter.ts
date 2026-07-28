import type {
  SubjectCommentPage,
  SubjectReviewDetail,
  SubjectReviewPage,
} from '../../../features/reviews/model.ts';
import type { DiscussionReply } from '../../../features/discussions/model.ts';
import type {
  BangumiBlog,
  BangumiSubjectComments,
  BangumiSubjectReviews,
} from '../api-next/schemas.ts';

export function mapBangumiComments(
  response: BangumiSubjectComments,
  offset = 0,
): SubjectCommentPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map((comment) => ({
      author: comment.user.nickname || comment.user.username,
      authorUsername: comment.user.username,
      body: comment.comment,
      id: String(comment.id),
      rating: comment.rate > 0 ? comment.rate : undefined,
      updatedAt: comment.updatedAt,
    })),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function mapBangumiReviews(
  response: BangumiSubjectReviews,
  offset = 0,
): SubjectReviewPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map((review) => ({
      author: review.user.nickname || review.user.username,
      authorUsername: review.user.username,
      id: String(review.entry.id),
      replyCount: review.entry.replies,
      summary: review.entry.summary,
      title: review.entry.title,
      updatedAt: review.entry.createdAt,
    })),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function mapBangumiReviewDetail(
  blog: BangumiBlog,
  body: string,
  replies: DiscussionReply[],
): SubjectReviewDetail {
  return {
    author: blog.user.nickname || blog.user.username,
    authorUsername: blog.user.username,
    body,
    id: String(blog.id),
    replies,
    replyCount: blog.replies,
    summary: '',
    title: blog.title,
    updatedAt: blog.updatedAt || blog.createdAt,
  };
}
