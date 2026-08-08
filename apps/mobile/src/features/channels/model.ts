export type ChannelSubject = {
  attentionCount?: number;
  coverUrl?: string;
  id: number;
  score?: number;
  title: string;
  type: number;
};

export type ChannelSubjectList = {
  items: ChannelSubject[];
};
