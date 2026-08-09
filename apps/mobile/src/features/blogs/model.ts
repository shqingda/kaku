export const BLOG_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'anime', label: '动画' },
  { id: 'book', label: '书籍' },
  { id: 'music', label: '音乐' },
  { id: 'game', label: '游戏' },
  { id: 'real', label: '三次元' },
] as const;

export type BlogFilter = (typeof BLOG_FILTERS)[number]['id'];

export type GlobalBlog = {
  author: string;
  authorUsername: string;
  coverUrl?: string;
  id: number;
  replyCount: number;
  summary: string;
  title: string;
  updatedAt: number;
};
export type GlobalBlogPage = {
  items: GlobalBlog[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
