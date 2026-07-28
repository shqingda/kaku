export type PublicIndexSummary = {
  author: string;
  authorUsername?: string;
  id: number;
  itemCount: number;
  title: string;
  updatedAt: number;
};

export type PublicIndexItem = {
  comment: string;
  coverUrl?: string;
  id: number;
  score?: number;
  title: string;
};

export type PublicIndexDetail = PublicIndexSummary & {
  collects: number;
  description: string;
  items: PublicIndexItem[];
  replyCount: number;
};

export type PublicIndexPage = {
  items: PublicIndexSummary[];
  total: number;
};

export type IndexesProvider = {
  getIndex: (indexId: number) => Promise<PublicIndexDetail>;
  getSubjectIndexes: (subjectId: number) => Promise<PublicIndexPage>;
};
