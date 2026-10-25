import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAppPreferences, saveAppPreferences } from './app-preferences';
import { DEFAULT_APP_PREFERENCES, type AppPreferences } from './preferences-model';

export type PreferenceLocalStatus = 'loading' | 'ready' | 'read-error' | 'write-error';
type LocalState = {
  active: boolean;
  hydrated: boolean;
  preferences: AppPreferences;
  patch: Partial<AppPreferences>;
  revision: number;
  status: PreferenceLocalStatus;
  persistedSyncEnabled: boolean;
  queue: Promise<unknown>;
  recovery: Promise<boolean> | null;
};

// Failed reads never become empty records. Edits made before recovery only patch
// the fields the user changed, preserving the stored privacy choice and theme.
export function useLocalPreferences() {
  const state = useRef<LocalState>({ active: false, hydrated: false,
    preferences: DEFAULT_APP_PREFERENCES, patch: {}, revision: 0, status: 'loading',
    persistedSyncEnabled: false, queue: Promise.resolve(), recovery: null }).current;
  const [view, setView] = useState(() => ({ ...state }));
  const publish = useCallback(() => {
    if (state.active) setView({ ...state });
  }, [state]);

  const persist = useCallback((next: AppPreferences, revision: number) => {
    const task = state.queue.catch(() => undefined).then(async () => {
      if (!state.active) return false;
      try {
        await saveAppPreferences(next);
        if (state.active && state.revision === revision) {
          state.patch = {};
          state.persistedSyncEnabled = next.syncEnabled;
          state.status = 'ready';
          publish();
          return true;
        }
      } catch {
        if (state.active && state.revision === revision) {
          state.status = 'write-error';
          publish();
        }
      }
      return false;
    });
    state.queue = task;
    return task;
  }, [publish, state]);

  const updateLocal = useCallback((patch: Partial<AppPreferences>) => {
    state.revision += 1;
    state.patch = { ...state.patch, ...patch };
    state.preferences = { ...state.preferences, ...patch };
    if (patch.syncEnabled !== undefined) state.persistedSyncEnabled = false;
    publish();
    return state.hydrated ? persist(state.preferences, state.revision) : Promise.resolve(false);
  }, [persist, publish, state]);

  const retryLocal = useCallback((): Promise<boolean> => {
    if (state.recovery) return state.recovery;
    if (!state.hydrated) { state.status = 'loading'; publish(); }
    state.recovery = (async () => {
      if (!state.hydrated) {
        try {
          const stored = await loadAppPreferences();
          if (!state.active) return false;
          state.preferences = { ...stored, ...state.patch };
          state.hydrated = true;
          if (Object.keys(state.patch).length === 0) {
            state.persistedSyncEnabled = stored.syncEnabled;
            state.status = 'ready';
            publish();
            return true;
          }
          publish();
        } catch {
          if (state.active) { state.status = 'read-error'; publish(); }
          return false;
        }
      }
      return persist(state.preferences, state.revision);
    })().finally(() => { state.recovery = null; });
    return state.recovery;
  }, [persist, publish, state]);

  useEffect(() => {
    state.active = true;
    void retryLocal();
    return () => { state.active = false; };
  }, [retryLocal, state]);

  const waitForLocalSave = useCallback(async () => {
    const revision = state.revision;
    await state.queue;
    return state.active && state.hydrated && state.status === 'ready' && state.revision === revision;
  }, [state]);

  const canSync = view.status === 'ready' && view.preferences.syncEnabled && view.persistedSyncEnabled;
  return {
    preferences: view.preferences,
    isReady: view.hydrated,
    localStatus: view.status,
    localError: view.status === 'read-error'
      ? '本机偏好暂时无法读取，原设置已保留，云同步已暂停。请重试读取。'
      : view.status === 'write-error'
        ? '偏好未能保存到本机，当前选择仍可使用，云同步已暂停。请重试保存。'
        : null,
    canSync,
    // Async cloud work needs the live gate before React has rendered a new view.
    canSyncNow: useCallback(() => state.status === 'ready'
      && state.preferences.syncEnabled && state.persistedSyncEnabled, [state]),
    updateLocal,
    retryLocal,
    waitForLocalSave,
  };
}
