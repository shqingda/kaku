export type PublicIndexSummary = {
  author: string;
  authorAvatarUrl?: string;
  authorUsername?: string;
  description?: string;
  id: number;
  itemCount: number;
  title: string;
  updatedAt: number;
};

export const INDEX_SORTS = [
  { id: 'latest', label: '最新' },
  { id: 'popular', label: '热门' },
] as const;

export type IndexSort = (typeof INDEX_SORTS)[number]['id'];

export type GlobalIndexPage = {
  items: PublicIndexSummary[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};

export type PublicIndexItem = {
  comment: string;
  coverUrl?: string;
  episodeNumber?: number;
  groupName?: string;
  id: number;
  kind:
    | 'blog'
    | 'character'
    | 'episode'
    | 'groupTopic'
    | 'person'
    | 'subject'
    | 'subjectTopic';
  parentId?: number;
  score?: number;
  title: string;
  type?: number;
};

export type PublicIndexDetail = PublicIndexSummary & {
  collects: number;
  description: string;
  isPrivate?: boolean;
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
  getIndex: (
    indexId: number,
    signal?: AbortSignal,
  ) => Promise<PublicIndexDetail>;
  getIndexItems: (
    indexId: number,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<PublicIndexItemPage>;
  getSubjectIndexes: (
    subjectId: number,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<PublicIndexPage>;
};
