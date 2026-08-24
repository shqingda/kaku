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
import { buildPreferencesBody, parseCloudPreferences } from '@/infrastructure/kaku/preferences-client';
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
  isReady: boolean;
  preferences: AppPreferences;
  retryCloudSync: () => Promise<void>;
  setTheme: (theme: ThemePreference) => void;
  syncing: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { request, session } = useAuth();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const preferencesRef = useRef<AppPreferences>(DEFAULT_APP_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    void loadAppPreferences().then((loaded) => {
      if (cancelled) return;
      preferencesRef.current = loaded;
      setPreferences(loaded);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const pushToCloud = useCallback(
    async (next: AppPreferences) => {
      setSyncing(true);
      try {
        const response = await request('/me/preferences', {
          body: buildPreferencesBody(next.theme),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        });
        const cloud = await parseCloudPreferences(response);
        const synced: AppPreferences = {
          theme: cloud.theme,
          updatedAt: cloud.updatedAt ?? Date.now(),
        };
        preferencesRef.current = synced;
        setPreferences(synced);
        await saveAppPreferences(synced);
        setCloudError(null);
      } catch (caughtError) {
        setCloudError(
          userErrorMessage(caughtError, '偏好暂未同步到云端，可稍后重试。'),
        );
      } finally {
        setSyncing(false);
      }
    },
    [request],
  );

  const syncFromCloud = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await request('/me/preferences');
      const cloud = await parseCloudPreferences(response);
      const { applied, pushToCloud: shouldPush } = mergePreferences(
        preferencesRef.current,
        cloud,
      );
      preferencesRef.current = applied;
      setPreferences(applied);
      await saveAppPreferences(applied);
      if (shouldPush) {
        await pushToCloud(applied);
      }
    } catch (caughtError) {
      setCloudError(
        userErrorMessage(caughtError, '偏好同步失败，请稍后重试。'),
      );
    } finally {
      setSyncing(false);
    }
  }, [pushToCloud, request]);

  useEffect(() => {
    if (!session) {
      setCloudError(null);
      return;
    }
    void syncFromCloud();
  }, [session, syncFromCloud]);

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      const next: AppPreferences = { theme, updatedAt: Date.now() };
      preferencesRef.current = next;
      setPreferences(next);
      void saveAppPreferences(next);
      if (session) {
        void pushToCloud(next);
      }
    },
    [pushToCloud, session],
  );

  const retryCloudSync = useCallback(async () => {
    if (!session || !cloudError) {
      return;
    }
    await syncFromCloud();
  }, [cloudError, session, syncFromCloud]);

  const value = useMemo(
    () => ({ cloudError, isReady, preferences, retryCloudSync, setTheme, syncing }),
    [cloudError, isReady, preferences, retryCloudSync, setTheme, syncing],
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
