import type { CollectionStatus } from '@/features/watching/model';

export type PublicUserCollection = {
  collectionStatus?: CollectionStatus;
  coverUrl?: string;
  id: number;
  progress: number;
  rate?: number;
  subjectType: number;
  title: string;
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

export type PublicTimelineItem = {
  createdAt: number;
  id: number;
  subjectId?: number;
  text: string;
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

export type UsersProvider = {
  getPublicUser: (username: string) => Promise<PublicUserProfile>;
  getPublicUserCollections: (
    username: string,
    subjectType: number,
    offset: number,
    collectionStatus?: CollectionStatus,
    signal?: AbortSignal,
  ) => Promise<PublicUserCollectionPage>;
  getPublicUserBlogs: (
    username: string,
    offset: number,
  ) => Promise<PublicUserBlogPage>;
  getPublicUserFriends: (
    username: string,
    offset: number,
  ) => Promise<PublicUserFriendPage>;
  getPublicUserTimeline: (
    username: string,
    cursor?: string,
  ) => Promise<PublicTimelinePage>;
};
