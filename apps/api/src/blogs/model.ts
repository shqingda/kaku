export type PublicBlog = {
  author: string;
  authorUsername: string;
  coverUrl?: string;
  id: number;
  replyCount: number;
  summary: string;
  title: string;
  updatedAt: number;
};
export type PublicBlogPage = {
  items: PublicBlog[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
