import Storage from 'expo-sqlite/kv-store';
import { parseStoredHistory } from '@/features/history/history-storage';
import {
  parseSearchHistoryRecord,
  SEARCH_HISTORY_LIMIT,
  type SearchHistoryRecord,
} from './search-history-model';

// Legacy unscoped data has no trustworthy owner; cloud data restores per account.
const SEARCH_HISTORY_KEY = 'kaku-recent-searches';

export async function loadSearchHistory(userId?: number): Promise<SearchHistoryRecord> {
  const value = await Storage.getItem(`${SEARCH_HISTORY_KEY}:v2:${userId ?? 'guest'}`);
  return parseStoredHistory(value, parseSearchHistoryRecord);
}

export async function saveSearchHistory(record: SearchHistoryRecord, userId?: number) {
  // The caller decides how to report failure; explicit clearing must not claim
  // success when the stored history will return after a restart.
  await Storage.setItem(
    `${SEARCH_HISTORY_KEY}:v2:${userId ?? 'guest'}`,
    JSON.stringify({
      items: record.items.slice(0, SEARCH_HISTORY_LIMIT),
      updatedAt: record.updatedAt,
    }),
  );
}
