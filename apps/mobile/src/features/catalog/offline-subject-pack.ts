import Storage from 'expo-sqlite/kv-store';

import type { CatalogSubject } from './model.ts';
import {
  OFFLINE_SUBJECT_PACK_TTL_MS,
  parseOfflineSubjectPack,
  readPackedSubject,
  upsertOfflineSubject,
} from './offline-subject-pack-model.ts';

const STORAGE_KEY = 'kaku-offline-subjects-v1';
// Serialize read-modify-write operations so a removal cannot overwrite a new save.
let pending: Promise<unknown> = Promise.resolve();
function mutatePack<T>(action: () => Promise<T>): Promise<T> {
  const next = pending.then(action, action);
  pending = next.catch(() => {});
  return next;
}

async function readPack() {
  const raw = await Storage.getItem(STORAGE_KEY);
  return parseOfflineSubjectPack(raw ? JSON.parse(raw) : null);
}

async function writePack(pack: ReturnType<typeof parseOfflineSubjectPack>) {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(pack));
}

export function saveOfflineSubject(subject: CatalogSubject) {
  return mutatePack(async () => {
    await writePack(upsertOfflineSubject(await readPack(), subject));
  });
}

export async function loadOfflineSubject(subjectId: number) {
  try { return readPackedSubject(await readPack(), subjectId); }
  catch { return null; }
}

export async function listOfflineSubjects() {
  await pending;
  return (await readPack()).items.filter(item =>
    Date.now() - item.savedAt <= OFFLINE_SUBJECT_PACK_TTL_MS,
  );
}

export function removeOfflineSubject(subjectId: number) {
  return mutatePack(async () => {
    const pack = await readPack();
    await writePack({ items: pack.items.filter(item => item.subject.id !== subjectId) });
  });
}

export function clearOfflineSubjectPack() {
  return mutatePack(() => Storage.removeItem(STORAGE_KEY));
}
