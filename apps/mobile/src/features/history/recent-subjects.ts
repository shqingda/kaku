import Storage from 'expo-sqlite/kv-store';

import {
  addRecentSubject,
  RECENT_SUBJECT_LIMIT,
  type RecentSubject,
} from './recent-subjects-model';

const RECENT_SUBJECTS_KEY = 'kaku-recent-subjects';

function isRecentSubject(value: unknown): value is RecentSubject {
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
    (subject.coverUrl === undefined || typeof subject.coverUrl === 'string')
  );
}

export async function loadRecentSubjects() {
  try {
    const value = await Storage.getItem(RECENT_SUBJECTS_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isRecentSubject)
      .filter(
        (item, index, items) =>
          items.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .slice(0, RECENT_SUBJECT_LIMIT);
  } catch {
    return [];
  }
}

export async function rememberRecentSubject(subject: RecentSubject) {
  try {
    const current = await loadRecentSubjects();
    await Storage.setItem(
      RECENT_SUBJECTS_KEY,
      JSON.stringify(addRecentSubject(current, subject)),
    );
  } catch {
    // Browsing history is optional and must never block a subject page.
  }
}

export async function clearRecentSubjects() {
  try {
    await Storage.removeItem(RECENT_SUBJECTS_KEY);
  } catch {
    // Clearing local convenience data remains best-effort.
  }
}
