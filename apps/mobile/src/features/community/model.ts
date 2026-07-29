import type { DiscussionReply } from '@/features/discussions/model';

export type PublicGroup = {
  iconUrl?: string;
  memberCount: number;
  name: string;
  title: string;
};

export type PublicGroupTopicSummary = {
  author: string;
  authorAvatarUrl?: string;
  authorUsername?: string;
  groupName?: string;
  groupTitle?: string;
  id: number;
  replyCount: number;
  title: string;
  updatedAt: number;
};

export type PublicCommunity = {
  groups: PublicGroup[];
};

export type PublicGroupDetail = PublicGroup & {
  description: string;
  topicCount: number;
};

export type PublicGroupTopic = PublicGroupTopicSummary & {
  replies: DiscussionReply[];
};

export type PublicGroupTopicPage = {
  items: PublicGroupTopicSummary[];
  nextOffset?: number;
  total: number;
};
