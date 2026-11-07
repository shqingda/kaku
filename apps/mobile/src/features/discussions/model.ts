import type { RichTextBlock } from '@/features/rich-text/model';

type ReplyReference = {
  replyId: string;
  author: string;
  body?: string;
};

export type DiscussionReply = {
  id: string;
  author: string;
  authorAvatarUrl?: string;
  authorId?: number;
  authorUsername?: string;
  body: string;
  createdAt: string;
  // 隐藏屏蔽用户后保留原楼层号；未设置时楼层就是列表位置。
  floor?: number;
  replyTo?: ReplyReference;
  segments?: RichTextBlock[];
};

export type DiscussionTopic = {
  id: string;
  subjectId: number;
  episodeNumber?: number;
  title: string;
  author: string;
  authorId?: number;
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
