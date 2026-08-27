import type { DataProvider } from '@kaku/shared';

export type SubjectEnrichment = {
  matched: boolean;
  provider: DataProvider;
  score?: number;
  title?: string;
  trailerUrl?: string;
  url?: string;
};
