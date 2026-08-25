export const SEARCH_HISTORY_LIMIT = 8;

export type SearchHistoryRecord = {
  items: string[];
  updatedAt: number | null;
};

export function addRecentSearch(current: string[], keyword: string) {
  const normalized = keyword.trim();

  if (!normalized) return current;

  return [
    normalized,
    ...current.filter((item) => item !== normalized),
  ].slice(0, SEARCH_HISTORY_LIMIT);
}

export function mergeSearchHistory(
  local: SearchHistoryRecord,
  cloud: SearchHistoryRecord,
) {
  if (local.updatedAt === null) return { record: cloud, pushToCloud: false };
  if (cloud.updatedAt === null) return { record: local, pushToCloud: true };
  if (local.updatedAt > cloud.updatedAt) {
    return { record: local, pushToCloud: true };
  }
  return { record: cloud, pushToCloud: false };
}

export function parseSearchHistoryRecord(value: unknown): SearchHistoryRecord {
  const candidate = Array.isArray(value)
    ? { items: value, updatedAt: null }
    : value && typeof value === 'object'
      ? (value as { items?: unknown; updatedAt?: unknown })
      : {};
  const items = Array.isArray(candidate.items)
    ? candidate.items
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item, index, values) => values.indexOf(item) === index)
        .slice(0, SEARCH_HISTORY_LIMIT)
    : [];
  const updatedAt =
    typeof candidate.updatedAt === 'number' && candidate.updatedAt >= 0
      ? candidate.updatedAt
      : null;
  return { items, updatedAt };
}
