export type NotificationTarget =
  | { id: number; kind: 'group-topic'; replyId?: number }
  | { id: number; kind: 'subject-topic'; replyId?: number }
  | { kind: 'user'; username: string };

export type UserNotification = {
  action: string;
  createdAt: number;
  id: number;
  sender: {
    avatarUrl?: string;
    nickname: string;
    username: string;
  };
  target?: NotificationTarget;
  title: string;
  unread: boolean;
};

export type NotificationList = {
  items: UserNotification[];
  total: number;
  unreadCount: number;
};
