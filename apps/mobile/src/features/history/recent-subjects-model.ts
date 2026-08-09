export const RECENT_SUBJECT_LIMIT = 10;

export type RecentSubject = {
  coverUrl?: string;
  id: number;
  title: string;
  type: number;
  viewedAt: number;
};

export function addRecentSubject(
  current: RecentSubject[],
  subject: RecentSubject,
) {
  return [
    subject,
    ...current.filter((item) => item.id !== subject.id),
  ].slice(0, RECENT_SUBJECT_LIMIT);
}
