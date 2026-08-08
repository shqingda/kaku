import type { RankedSubject } from '../rankings/model.ts';

export type BrowseSubjectPage = {
  items: RankedSubject[];
  nextPage?: number;
  totalPages: number;
};
