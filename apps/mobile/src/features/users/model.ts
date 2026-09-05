import type { CollectionStatus } from '@/features/watching/model';

export type PublicUserCollection = {
  collectionStatus?: CollectionStatus;
  coverUrl?: string;
  id: number;
  progress: number;
  volumeProgress: number;
  rate?: number;
  subjectType: number;
  title: string;
  originalTitle?: string;
  totalEpisodes: number;
  updatedAt: string;
};

export type PublicUserBlog = {
  id: number;
  replyCount: number;
  summary: string;
  title: string;
  updatedAt: number;
};

export type PublicUserCollectionPage = {
  items: PublicUserCollection[];
  nextOffset?: number;
  total: number;
};

export type PublicUserBlogPage = {
  items: PublicUserBlog[];
  nextOffset?: number;
  total: number;
};

export type PublicUserFriend = {
  avatarUrl?: string;
  nickname: string;
  username: string;
};

export type PublicUserFriendPage = {
  items: PublicUserFriend[];
  nextOffset?: number;
  total: number;
};

export type PublicUserEntityKind = 'character' | 'person';

export type PublicUserEntityCollection = {
  collectedAt: string;
  id: number;
  imageUrl?: string;
  kind: PublicUserEntityKind;
  name: string;
  subtitle: string;
};

export type PublicUserEntityCollectionPage = {
  items: PublicUserEntityCollection[];
  total: number;
};

export type PublicTimelineItem = {
  createdAt: number;
  id: number;
  leadingText?: string;
  subjectId?: number;
  subjectTitle?: string;
  text: string;
  trailingText?: string;
};

export type PublicTimelinePage = {
  items: PublicTimelineItem[];
  nextCursor?: string;
};

export type PublicUserProfile = {
  avatarUrl?: string;
  id: number;
  nickname: string;
  sign: string;
  username: string;
};
