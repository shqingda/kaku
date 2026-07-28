export type DiscoverSubject = {
  coverUrl?: string;
  date?: string;
  id: number;
  score?: number;
  title: string;
};

export type CalendarDay = {
  id: number;
  label: string;
  subjects: DiscoverSubject[];
};

export type DiscoverSubjectPage = {
  items: DiscoverSubject[];
  nextOffset?: number;
  total: number;
};

export type DiscoverProvider = {
  getCalendar: () => Promise<CalendarDay[]>;
  getRankedSubjects: (offset: number) => Promise<DiscoverSubjectPage>;
  searchSubjects: (
    keyword: string,
    offset: number,
  ) => Promise<DiscoverSubjectPage>;
};
