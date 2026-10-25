import Storage from 'expo-sqlite/kv-store';

import {
  DEFAULT_APP_PREFERENCES,
  parseAppPreferences,
  type AppPreferences,
} from './preferences-model';

const STORAGE_KEY = 'kaku-app-preferences';

export async function loadAppPreferences(): Promise<AppPreferences> {
  const raw = await Storage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_APP_PREFERENCES;
  return parseAppPreferences(JSON.parse(raw));
}

export async function saveAppPreferences(preferences: AppPreferences) {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
