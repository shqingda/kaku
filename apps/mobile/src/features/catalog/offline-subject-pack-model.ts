import type { CatalogSubject } from './model.ts';

export const OFFLINE_SUBJECT_PACK_MAX = 10;
export const OFFLINE_SUBJECT_PACK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type PackedSubject = {
  savedAt: number;
  subject: CatalogSubject;
};

export type OfflineSubjectPack = {
  items: PackedSubject[];
};

export function stripOfflineSource(subject: CatalogSubject): CatalogSubject {
  const { offlineSource: _ignored, ...rest } = subject;
  return rest;
}

export function upsertOfflineSubject(
  pack: OfflineSubjectPack,
  subject: CatalogSubject,
  now = Date.now(),
): OfflineSubjectPack {
  const nextSubject = stripOfflineSource(subject);
  const items = [
    { savedAt: now, subject: nextSubject },
    ...pack.items.filter((item) => item.subject.id !== nextSubject.id),
  ]
    .filter((item) => now - item.savedAt <= OFFLINE_SUBJECT_PACK_TTL_MS)
    .slice(0, OFFLINE_SUBJECT_PACK_MAX);

  return { items };
}

export function readPackedSubject(
  pack: OfflineSubjectPack,
  subjectId: number,
  now = Date.now(),
): CatalogSubject | null {
  const packed = pack.items.find((item) => item.subject.id === subjectId);
  if (!packed) return null;
  if (now - packed.savedAt > OFFLINE_SUBJECT_PACK_TTL_MS) return null;
  return { ...packed.subject, offlineSource: 'pack' };
}

export function parseOfflineSubjectPack(value: unknown): OfflineSubjectPack {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { items?: unknown }).items)) {
    return { items: [] };
  }

  const items = (value as OfflineSubjectPack).items.filter(
    (item) =>
      item &&
      typeof item.savedAt === 'number' &&
      item.subject &&
      typeof item.subject.id === 'number' &&
      Array.isArray(item.subject.episodes),
  );

  return { items };
}
