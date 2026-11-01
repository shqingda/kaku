export type RecentSubject = {
  coverUrl?: string;
  id: number;
  title: string;
  type: number;
  viewedAt: number;
};

// Stored-record compatibility shared by the API and mobile app. Request limits
// and each reader's handling of invalid records remain at their own boundary.
export function isRecentSubject(value: unknown): value is RecentSubject {
  if (!value || typeof value !== 'object') return false;

  const subject = value as Partial<RecentSubject>;
  return (
    Number.isInteger(subject.id) &&
    Number(subject.id) > 0 &&
    typeof subject.title === 'string' &&
    Boolean(subject.title.trim()) &&
    Number.isInteger(subject.type) &&
    typeof subject.viewedAt === 'number' &&
    Number.isFinite(subject.viewedAt) &&
    subject.viewedAt >= 0 &&
    (subject.coverUrl === undefined || typeof subject.coverUrl === 'string')
  );
}
