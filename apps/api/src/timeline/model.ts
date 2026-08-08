export type FriendTimelineItem = {
  createdAt: number;
  id: number;
  leadingText?: string;
  replies: number;
  subjectId?: number;
  subjectTitle?: string;
  text: string;
  trailingText?: string;
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
