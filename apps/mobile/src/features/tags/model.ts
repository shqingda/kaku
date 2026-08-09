export type PublicTag = {
  count: number;
  name: string;
};

export type GlobalTagPage = {
  items: PublicTag[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
