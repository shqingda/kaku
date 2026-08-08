export type RankedSubject = {
  coverUrl?: string;
  date?: string;
  id: number;
  score?: number;
  title: string;
  type: number;
};

export type RankedSubjectPage = {
  items: RankedSubject[];
  nextOffset?: number;
  total: number;
};
