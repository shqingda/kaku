import Storage from 'expo-sqlite/kv-store';

import {
  RECENT_SUBJECT_LIMIT,
  parseRecentSubjectsRecord,
  type RecentSubjectsRecord,
} from './recent-subjects-model';

const RECENT_SUBJECTS_KEY = 'kaku-recent-subjects';

export async function loadRecentSubjects(): Promise<RecentSubjectsRecord> {
  try {
    const value = await Storage.getItem(RECENT_SUBJECTS_KEY);
    if (!value) return { items: [], updatedAt: null };

    const parsed: unknown = JSON.parse(value);
    return parseRecentSubjectsRecord(parsed);
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function saveRecentSubjects(record: RecentSubjectsRecord) {
  try {
    await Storage.setItem(
      RECENT_SUBJECTS_KEY,
      JSON.stringify({
        items: record.items.slice(0, RECENT_SUBJECT_LIMIT),
        updatedAt: record.updatedAt,
      }),
    );
  } catch {
    // Browsing history is optional and must never block a subject page.
  }
}
