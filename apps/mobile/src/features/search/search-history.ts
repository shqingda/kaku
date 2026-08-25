import Storage from 'expo-sqlite/kv-store';
import {
  parseSearchHistoryRecord,
  SEARCH_HISTORY_LIMIT,
  type SearchHistoryRecord,
} from './search-history-model';

const SEARCH_HISTORY_KEY = 'kaku-recent-searches';

export async function loadSearchHistory(): Promise<SearchHistoryRecord> {
  try {
    const value = await Storage.getItem(SEARCH_HISTORY_KEY);
    if (!value) return { items: [], updatedAt: null };

    const parsed: unknown = JSON.parse(value);
    return parseSearchHistoryRecord(parsed);
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function saveSearchHistory(record: SearchHistoryRecord) {
  try {
    await Storage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify({
        items: record.items.slice(0, SEARCH_HISTORY_LIMIT),
        updatedAt: record.updatedAt,
      }),
    );
  } catch {
    // Search history is a convenience. Storage failures must not block search.
  }
}
