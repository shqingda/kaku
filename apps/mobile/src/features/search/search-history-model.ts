export const SEARCH_HISTORY_LIMIT = 8;

export function addRecentSearch(current: string[], keyword: string) {
  const normalized = keyword.trim();

  if (!normalized) return current;

  return [
    normalized,
    ...current.filter((item) => item !== normalized),
  ].slice(0, SEARCH_HISTORY_LIMIT);
}
