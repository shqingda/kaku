import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { usePublicConfig } from '@/features/config/use-public-config';
import {
  buildPreferencesBody,
  parseCloudPreferences,
} from '@/infrastructure/kaku/preferences-client';
import { userErrorMessage } from '@/lib/user-error-message';

import { loadAppPreferences, saveAppPreferences } from './app-preferences';
import {
  DEFAULT_APP_PREFERENCES,
  mergePreferences,
  type AppPreferences,
  type ThemePreference,
} from './preferences-model';

type PreferencesContextValue = {
  cloudError: string | null;
  cloudSyncAvailable: boolean;
  isReady: boolean;
  preferences: AppPreferences;
  retryCloudSync: () => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  syncing: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { request, session } = useAuth();
  const configQuery = usePublicConfig();
  const cloudSyncAvailable =
    configQuery.data?.config.features.preferenceCloudSync ?? true;
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const preferencesRef = useRef<AppPreferences>(DEFAULT_APP_PREFERENCES);

  const revisionRef = useRef(0);
  const writesRef = useRef(Promise.resolve());
  const dirtyRef = useRef(false);
  const scopeRef = useRef<{
    controller: AbortController;
    queue: Promise<void>;
  } | null>(null);

  const applyLocal = useCallback((next: AppPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    const task = writesRef.current.catch(() => undefined).then(() => saveAppPreferences(next));
    writesRef.current = task;
    return task;
  }, []);

  useEffect(() => {
    let active = true;
    void loadAppPreferences().then((loaded) => {
      if (!active) return;
      if (revisionRef.current === 0) {
        preferencesRef.current = loaded;
        setPreferences(loaded);
      }
      setIsReady(true);
    });
    return () => { active = false; };
  }, []);

  const enqueue = useCallback((pushOnly: boolean) => {
    const scope = scopeRef.current;
    if (!scope) return Promise.resolve();
    const current = () => scopeRef.current === scope && !scope.controller.signal.aborted;
    scope.queue = scope.queue.then(async () => {
      if (!current()) return;
      const revision = revisionRef.current;
      setSyncing(true);
      try {
        let next = preferencesRef.current;
        let shouldPush = pushOnly || dirtyRef.current;
        if (!shouldPush) {
          const cloud = await parseCloudPreferences(await request('/me/preferences', {
            signal: scope.controller.signal,
          }));
          if (!current() || revisionRef.current !== revision) return;
          const merged = mergePreferences(next, cloud);
          next = merged.applied;
          shouldPush = merged.pushToCloud;
          await applyLocal(next);
        }
        if (shouldPush && current()) {
          const cloud = await parseCloudPreferences(await request('/me/preferences', {
            body: buildPreferencesBody(next.theme),
            headers: { 'Content-Type': 'application/json' },
            method: 'PUT', signal: scope.controller.signal,
          }));
          if (!current() || revisionRef.current !== revision) return;
          // The device's privacy switch is never owned by a cloud response.
          dirtyRef.current = false;
          await applyLocal({
            ...preferencesRef.current,
            theme: cloud.theme,
            updatedAt: cloud.updatedAt ?? Date.now(),
          });
        }
        if (current()) setCloudError(null);
      } catch (error) {
        if (current()) setCloudError(userErrorMessage(error, '偏好同步失败，请稍后重试。'));
      } finally {
        if (current()) setSyncing(false);
      }
    });
    return scope.queue;
  }, [applyLocal, request]);

  const userId = session?.user.id;
  useEffect(() => {
    setCloudError(null);
    setSyncing(false);
    if (!isReady || userId === undefined || !cloudSyncAvailable || !preferences.syncEnabled) return;
    const scope = { controller: new AbortController(), queue: Promise.resolve() };
    scopeRef.current = scope;
    void enqueue(false);
    return () => {
      scope.controller.abort();
      if (scopeRef.current === scope) scopeRef.current = null;
    };
  }, [cloudSyncAvailable, enqueue, isReady, preferences.syncEnabled, userId]);

  const setTheme = useCallback((theme: ThemePreference) => {
    revisionRef.current += 1;
    dirtyRef.current = true;
    void applyLocal({ ...preferencesRef.current, theme, updatedAt: Date.now() });
    void enqueue(true);
  }, [applyLocal, enqueue]);

  const setSyncEnabled = useCallback((enabled: boolean) => {
    revisionRef.current += 1;
    if (!enabled) {
      scopeRef.current?.controller.abort();
      scopeRef.current = null;
    }
    void applyLocal({ ...preferencesRef.current, syncEnabled: enabled });
  }, [applyLocal]);

  const retryCloudSync = useCallback(() => enqueue(false), [enqueue]);

  const value = useMemo(
    () => ({
      cloudError,
      cloudSyncAvailable,
      isReady,
      preferences,
      retryCloudSync,
      setSyncEnabled,
      setTheme,
      syncing,
    }),
    [
      cloudError,
      cloudSyncAvailable,
      isReady,
      preferences,
      retryCloudSync,
      setSyncEnabled,
      setTheme,
      syncing,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return context;
}
