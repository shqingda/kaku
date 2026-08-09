export type PublicIndex = {
  author: string;
  authorAvatarUrl?: string;
  authorUsername: string;
  description: string;
  id: number;
  itemCount: number;
  title: string;
  updatedAt: number;
};

export type PublicIndexPage = {
  items: PublicIndex[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
