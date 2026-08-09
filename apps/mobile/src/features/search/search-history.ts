import Storage from 'expo-sqlite/kv-store';
import { SEARCH_HISTORY_LIMIT } from './search-history-model';

export { addRecentSearch } from './search-history-model';

const SEARCH_HISTORY_KEY = 'kaku-recent-searches';

export async function loadRecentSearches() {
  try {
    const value = await Storage.getItem(SEARCH_HISTORY_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export async function saveRecentSearches(items: string[]) {
  try {
    await Storage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(items.slice(0, SEARCH_HISTORY_LIMIT)),
    );
  } catch {
    // Search history is a convenience. Storage failures must not block search.
  }
}

export async function clearRecentSearches() {
  try {
    await Storage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Keep clearing best-effort for the same reason as saving.
  }
}
