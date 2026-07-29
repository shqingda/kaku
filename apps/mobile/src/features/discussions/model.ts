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
};

export type DiscussionTopic = {
  id: string;
  subjectId: number;
  episodeNumber?: number;
  title: string;
  author: string;
  authorUsername?: string;
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

export type DiscussionsProvider = {
  getEpisodeComments: (episodeId: number) => Promise<DiscussionReply[]>;
  getSubjectTopic: (topicId: number) => Promise<DiscussionTopic | null>;
  getSubjectTopics: (
    subjectId: number,
    limit: number,
    offset: number,
  ) => Promise<DiscussionTopicPage>;
};
