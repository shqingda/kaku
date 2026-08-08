export type FriendTimelineItem = {
  createdAt: number;
  id: number;
  replies: number;
  subjectId?: number;
  text: string;
  user: {
    avatarUrl?: string;
    nickname: string;
    username: string;
  };
};

export type FriendTimelinePage = {
  items: FriendTimelineItem[];
  nextUntil?: number;
};
