export type FriendTimelineItem = {
  blogId?: number;
  blogTitle?: string;
  createdAt: number;
  entityId?: number;
  entityKind?: 'character' | 'person';
  entityTitle?: string;
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
  userMentions?: { nickname: string; username: string }[];
};

export type FriendTimelinePage = {
  items: FriendTimelineItem[];
  nextUntil?: number;
};
