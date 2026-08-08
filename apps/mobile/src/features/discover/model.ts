export type DiscoverSubject = {
  coverUrl?: string;
  date?: string;
  id: number;
  score?: number;
  title: string;
  type: number;
};

export type CalendarDay = {
  id: number;
  label: string;
  subjects: DiscoverSubject[];
};

export type DiscoverSubjectPage = {
  items: DiscoverSubject[];
  nextOffset?: number;
  total?: number;
};

export type DiscoverProvider = {
  getCalendar: (signal?: AbortSignal) => Promise<CalendarDay[]>;
  getRankedSubjects: (
    subjectType: number,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<DiscoverSubjectPage>;
  searchSubjects: (
    keyword: string,
    subjectType: number,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<DiscoverSubjectPage>;
};
