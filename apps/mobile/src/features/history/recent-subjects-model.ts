import { isRecentSubject, type RecentSubject } from '@kaku/shared/recent-subjects-contract';

export type { RecentSubject } from '@kaku/shared/recent-subjects-contract';

export const RECENT_SUBJECT_LIMIT = 10;

export type RecentSubjectsRecord = {
  items: RecentSubject[];
  updatedAt: number | null;
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

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecentSubject)
    .map((item) => ({ ...item, title: item.title.trim() }))
    .sort((left, right) => right.viewedAt - left.viewedAt)
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, RECENT_SUBJECT_LIMIT);
}

export function parseRecentSubjectsRecord(
  value: unknown,
): RecentSubjectsRecord {
  const legacyItems = Array.isArray(value) ? normalizeItems(value) : null;
  if (legacyItems) {
    return {
      items: legacyItems,
      updatedAt: legacyItems[0]?.viewedAt ?? null,
    };
  }

  const candidate = value && typeof value === 'object'
    ? (value as { items?: unknown; updatedAt?: unknown })
    : {};
  const items = normalizeItems(candidate.items);
  const updatedAt =
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    candidate.updatedAt >= 0
      ? candidate.updatedAt
      : null;
  return { items, updatedAt };
}

function mergeItems(local: RecentSubject[], cloud: RecentSubject[]) {
  return normalizeItems([...local, ...cloud]);
}

export function mergeRecentSubjects(
  local: RecentSubjectsRecord,
  cloud: RecentSubjectsRecord,
) {
  if (local.updatedAt === null) return { record: cloud, pushToCloud: false };
  if (cloud.updatedAt === null) return { record: local, pushToCloud: true };

  if (!local.items.length || !cloud.items.length) {
    const localWins = local.updatedAt > cloud.updatedAt;
    return {
      record: localWins ? local : cloud,
      pushToCloud: localWins,
    };
  }

  const record = {
    items: mergeItems(local.items, cloud.items),
    updatedAt: Math.max(local.updatedAt, cloud.updatedAt),
  };
  return {
    record,
    pushToCloud: JSON.stringify(record.items) !== JSON.stringify(cloud.items),
  };
}
