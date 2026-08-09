export type PublicPersonKind = 'character' | 'person';

export type PublicPersonSummary = {
  categories: string[];
  commentCount: number;
  id: number;
  imageUrl?: string;
  kind: PublicPersonKind;
  metadata: string;
  name: string;
};

export type PublicPeoplePage = {
  items: PublicPersonSummary[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};
