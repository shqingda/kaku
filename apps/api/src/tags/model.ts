export type PublicTag = {
  count: number;
  name: string;
};

export type PublicTagPage = {
  items: PublicTag[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
