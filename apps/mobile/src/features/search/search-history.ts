import Storage from 'expo-sqlite/kv-store';
import {
  parseSearchHistoryRecord,
  SEARCH_HISTORY_LIMIT,
  type SearchHistoryRecord,
} from './search-history-model';

// Legacy unscoped data has no trustworthy owner; cloud data restores per account.
const SEARCH_HISTORY_KEY = 'kaku-recent-searches';

export async function loadSearchHistory(userId?: number): Promise<SearchHistoryRecord> {
  try {
    const value = await Storage.getItem(`${SEARCH_HISTORY_KEY}:v2:${userId ?? 'guest'}`);
    if (!value) return { items: [], updatedAt: null };

    const parsed: unknown = JSON.parse(value);
    return parseSearchHistoryRecord(parsed);
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function saveSearchHistory(record: SearchHistoryRecord, userId?: number) {
  try {
    await Storage.setItem(
      `${SEARCH_HISTORY_KEY}:v2:${userId ?? 'guest'}`,
      JSON.stringify({
        items: record.items.slice(0, SEARCH_HISTORY_LIMIT),
        updatedAt: record.updatedAt,
      }),
    );
  } catch {
    // Search history is a convenience. Storage failures must not block search.
  }
}
