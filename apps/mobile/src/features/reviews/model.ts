import type { DiscussionReply } from '@/features/discussions/model';

export type SubjectComment = {
  author: string;
  authorUsername?: string;
  body: string;
  id: string;
  rating?: number;
  updatedAt: number;
};

export type SubjectReview = {
  author: string;
  authorUsername?: string;
  id: string;
  replyCount: number;
  summary: string;
  title: string;
  updatedAt: number;
};

export type SubjectReviewDetail = SubjectReview & {
  body: string;
  replies: DiscussionReply[];
};

export type SubjectCommentPage = {
  items: SubjectComment[];
  nextOffset?: number;
  total: number;
};

export type SubjectReviewPage = {
  items: SubjectReview[];
  nextOffset?: number;
  total: number;
};
