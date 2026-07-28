export type PublicUserCollection = {
  coverUrl?: string;
  id: number;
  progress: number;
  rate?: number;
  status: string;
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

export type PublicUserProfile = {
  avatarUrl?: string;
  collections: PublicUserCollection[];
  blogs: PublicUserBlog[];
  blogTotal: number;
  friends: PublicUserFriend[];
  friendTotal: number;
  collectionTotal: number;
  id: number;
  nickname: string;
  sign: string;
  timeline: PublicTimelineItem[];
  username: string;
};

export type UsersProvider = {
  getPublicUser: (username: string) => Promise<PublicUserProfile>;
  getPublicUserCollections: (
    username: string,
    offset: number,
  ) => Promise<PublicUserCollectionPage>;
  getPublicUserBlogs: (
    username: string,
    offset: number,
  ) => Promise<PublicUserBlogPage>;
  getPublicUserFriends: (
    username: string,
    offset: number,
  ) => Promise<PublicUserFriendPage>;
};
