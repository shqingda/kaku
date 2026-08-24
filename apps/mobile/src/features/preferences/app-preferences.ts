import Storage from 'expo-sqlite/kv-store';

import {
  DEFAULT_APP_PREFERENCES,
  parseAppPreferences,
  type AppPreferences,
} from './preferences-model';

const STORAGE_KEY = 'kaku-app-preferences';

export async function loadAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await Storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;

    return parseAppPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  try {
    await Storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // 偏好读取失败时回退默认值；写入失败不阻塞交互。
  }
}
