import Storage from 'expo-sqlite/kv-store';

import type { SubjectNote } from './model';

const SUBJECT_NOTES_KEY = 'kaku-subject-notes-v1';

function isSubjectNote(value: unknown): value is SubjectNote {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const note = value as Partial<SubjectNote>;
  return (
    Number.isInteger(note.subjectId) &&
    Number(note.subjectId) > 0 &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.updatedAt === 'number' &&
    Number.isFinite(note.updatedAt)
  );
}

export async function loadSubjectNotes(): Promise<SubjectNote[]> {
  try {
    const value = await Storage.getItem(SUBJECT_NOTES_KEY);
    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSubjectNote);
  } catch {
    return [];
  }
}

export async function saveSubjectNote(note: SubjectNote) {
  try {
    const current = await loadSubjectNotes();
    const next = [
      note,
      ...current.filter((item) => item.subjectId !== note.subjectId),
    ];
    await Storage.setItem(SUBJECT_NOTES_KEY, JSON.stringify(next));
  } catch {
    // Local notes are best-effort and must never block a subject page.
  }
}

export async function removeSubjectNote(subjectId: number) {
  try {
    const current = await loadSubjectNotes();
    await Storage.setItem(
      SUBJECT_NOTES_KEY,
      JSON.stringify(current.filter((item) => item.subjectId !== subjectId)),
    );
  } catch {
    // Keeping the local note store best-effort.
  }
}
