import Storage from 'expo-sqlite/kv-store';

import type { CatalogSubject } from './model.ts';
import {
  parseOfflineSubjectPack,
  readPackedSubject,
  upsertOfflineSubject,
} from './offline-subject-pack-model.ts';

const STORAGE_KEY = 'kaku-offline-subjects-v1';

async function readPack() {
  try {
    const raw = await Storage.getItem(STORAGE_KEY);
    return parseOfflineSubjectPack(raw ? JSON.parse(raw) : null);
  } catch {
    return { items: [] };
  }
}

async function writePack(pack: ReturnType<typeof parseOfflineSubjectPack>) {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(pack));
}

export async function saveOfflineSubject(subject: CatalogSubject) {
  const pack = upsertOfflineSubject(await readPack(), subject);
  await writePack(pack);
}

export async function loadOfflineSubject(subjectId: number) {
  return readPackedSubject(await readPack(), subjectId);
}

export async function clearOfflineSubjectPack() {
  await Storage.removeItem(STORAGE_KEY);
}
