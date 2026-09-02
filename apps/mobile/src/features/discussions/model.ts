import type { BangumiContentBlock } from '@/lib/bangumi-content';

export type ReplyReference = {
  replyId: string;
  author: string;
  body?: string;
};

export type DiscussionReply = {
  id: string;
  author: string;
  authorAvatarUrl?: string;
  authorUsername?: string;
  body: string;
  createdAt: string;
  replyTo?: ReplyReference;
  segments?: BangumiContentBlock[];
};

export type DiscussionTopic = {
  id: string;
  subjectId: number;
  episodeNumber?: number;
  title: string;
  author: string;
  authorUsername?: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
  replies: DiscussionReply[];
  replyCount?: number;
};

export type DiscussionTopicPage = {
  nextOffset?: number;
  topics: DiscussionTopic[];
  total: number;
};
