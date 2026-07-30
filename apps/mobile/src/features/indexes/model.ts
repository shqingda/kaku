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
  type: number;
};

export type PublicIndexDetail = PublicIndexSummary & {
  collects: number;
  description: string;
  replyCount: number;
};

export type PublicIndexItemPage = {
  items: PublicIndexItem[];
  nextOffset?: number;
  total: number;
};

export type PublicIndexPage = {
  items: PublicIndexSummary[];
  nextOffset?: number;
  total: number;
};

export type IndexesProvider = {
  getIndex: (indexId: number) => Promise<PublicIndexDetail>;
  getIndexItems: (
    indexId: number,
    offset: number,
  ) => Promise<PublicIndexItemPage>;
  getSubjectIndexes: (
    subjectId: number,
    offset: number,
  ) => Promise<PublicIndexPage>;
};
