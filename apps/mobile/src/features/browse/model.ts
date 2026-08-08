import type { DiscoverSubject } from '@/features/discover/model';

export type BrowseSort = 'collects' | 'date' | 'rank' | 'trends';

export type BrowseSubjectPage = {
  items: DiscoverSubject[];
  nextPage?: number;
  totalPages: number;
};
