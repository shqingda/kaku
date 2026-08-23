export const MAX_SUBJECT_NOTE_LENGTH = 2000;

export type SubjectNote = {
  content: string;
  subjectId: number;
  title: string;
  updatedAt: number;
};

export function upsertSubjectNote(
  current: SubjectNote[],
  note: SubjectNote,
): SubjectNote[] {
  const content = note.content.trim();

  if (!content) {
    return current.filter((item) => item.subjectId !== note.subjectId);
  }

  const next: SubjectNote = {
    ...note,
    content,
  };

  return [
    next,
    ...current.filter((item) => item.subjectId !== note.subjectId),
  ];
}

export function removeSubjectNote(
  current: SubjectNote[],
  subjectId: number,
): SubjectNote[] {
  return current.filter((item) => item.subjectId !== subjectId);
}
