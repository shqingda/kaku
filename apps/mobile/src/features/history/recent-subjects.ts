import Storage from 'expo-sqlite/kv-store';

import {
  RECENT_SUBJECT_LIMIT,
  parseRecentSubjectsRecord,
  type RecentSubjectsRecord,
} from './recent-subjects-model';

// Legacy unscoped data has no trustworthy owner; cloud data restores per account.
const RECENT_SUBJECTS_KEY = 'kaku-recent-subjects';

export async function loadRecentSubjects(userId?: number): Promise<RecentSubjectsRecord> {
  try {
    const value = await Storage.getItem(`${RECENT_SUBJECTS_KEY}:v2:${userId ?? 'guest'}`);
    if (!value) return { items: [], updatedAt: null };

    const parsed: unknown = JSON.parse(value);
    return parseRecentSubjectsRecord(parsed);
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function saveRecentSubjects(record: RecentSubjectsRecord, userId?: number) {
  try {
    await Storage.setItem(
      `${RECENT_SUBJECTS_KEY}:v2:${userId ?? 'guest'}`,
      JSON.stringify({
        items: record.items.slice(0, RECENT_SUBJECT_LIMIT),
        updatedAt: record.updatedAt,
      }),
    );
  } catch {
    // Browsing history is optional and must never block a subject page.
  }
}
