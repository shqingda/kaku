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

import type { AuthRequestScope } from '@/features/auth/auth-request-scope';
import { useAuth } from '@/features/auth/auth-provider';
import { usePublicConfig } from '@/features/config/use-public-config';
import {
  buildPreferencesBody,
  parseCloudPreferences,
} from '@/infrastructure/kaku/preferences-client';
import { userErrorMessage } from '@/lib/user-error-message';

import { useLocalPreferences, type PreferenceLocalStatus } from './use-local-preferences';
import {
  mergePreferences,
  type AppPreferences,
  type ThemePreference,
} from './preferences-model';

type PreferencesContextValue = {
  cloudError: string | null;
  cloudSyncAvailable: boolean;
  canSync: boolean;
  canSyncNow: () => boolean;
  isCurrentSyncScope: () => boolean;
  isReady: boolean;
  localStatus: PreferenceLocalStatus;
  localError: string | null;
  preferences: AppPreferences;
  retryLocal: () => Promise<boolean>;
  retryCloudSync: () => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  syncing: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { authEpoch, captureRequest, session } = useAuth();
  const configQuery = usePublicConfig();
  const cloudSyncAvailable =
    configQuery.data?.config.features.preferenceCloudSync ?? true;
  const { preferences, isReady, localStatus, localError, retryLocal, updateLocal, waitForLocalSave,
    canSync: localCanSync, canSyncNow: localCanSyncNow } = useLocalPreferences();
  const canSync = cloudSyncAvailable && localCanSync;
  const availabilityRef = useRef(cloudSyncAvailable);
  availabilityRef.current = cloudSyncAvailable;
  const [syncGeneration, setSyncGeneration] = useState(0);
  const syncGenerationRef = useRef(0);
  const isCurrentSyncScope = useCallback(() => syncGenerationRef.current === syncGeneration, [syncGeneration]);
  const canSyncNow = useCallback(() => isCurrentSyncScope()
    && availabilityRef.current && localCanSyncNow(), [isCurrentSyncScope, localCanSyncNow]);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const scopeRef = useRef<{
    auth: AuthRequestScope;
    controller: AbortController;
    queue: Promise<void>;
  } | null>(null);

  const applyLocal = useCallback((patch: Partial<AppPreferences>) => {
    preferencesRef.current = { ...preferencesRef.current, ...patch };
    return updateLocal(patch);
  }, [updateLocal]);

  const enqueue = useCallback((pushOnly: boolean) => {
    const scope = scopeRef.current;
    if (!scope) return Promise.resolve();
    const current = () => scopeRef.current === scope && scope.auth.isCurrent()
      && !scope.controller.signal.aborted && canSyncNow();
    scope.queue = scope.queue.then(async () => {
      if (!current() || !await waitForLocalSave() || !current()) return;
      // A manual retry may already have uploaded the edit while its automatic
      // task waited. Do not send the same saved revision twice.
      if (pushOnly && !dirtyRef.current) return;
      const revision = revisionRef.current;
      setSyncing(true);
      try {
        let next = preferencesRef.current;
        let shouldPush = pushOnly || dirtyRef.current;
        if (!shouldPush) {
          const cloud = await parseCloudPreferences(await scope.auth.request('/me/preferences', {
            signal: scope.controller.signal,
          }));
          if (!current() || revisionRef.current !== revision) return;
          const merged = mergePreferences(next, cloud);
          next = merged.applied;
          shouldPush = merged.pushToCloud;
          if (!await applyLocal({ theme: next.theme, updatedAt: next.updatedAt })) return;
        }
        if (shouldPush && current()) {
          const cloud = await parseCloudPreferences(await scope.auth.request('/me/preferences', {
            body: buildPreferencesBody(next.theme),
            headers: { 'Content-Type': 'application/json' },
            method: 'PUT', signal: scope.controller.signal,
          }));
          if (!current() || revisionRef.current !== revision) return;
          // The device's privacy switch is never owned by a cloud response.
          const saved = await applyLocal({
            theme: cloud.theme,
            updatedAt: cloud.updatedAt ?? Date.now(),
          });
          if (!saved || !current() || revisionRef.current !== revision) return;
          dirtyRef.current = false;
        }
        if (current()) setCloudError(null);
      } catch (error) {
        if (current()) setCloudError(userErrorMessage(error, '偏好同步失败，请稍后重试。'));
      } finally {
        if (current()) setSyncing(false);
      }
    });
    return scope.queue;
  }, [applyLocal, canSyncNow, waitForLocalSave]);

  const userId = session?.user.id;
  useEffect(() => {
    setCloudError(null);
    setSyncing(false);
    if (!canSync || userId === undefined) return;
    const scope = { auth: captureRequest(), controller: new AbortController(), queue: Promise.resolve() };
    scopeRef.current = scope;
    void enqueue(false);
    return () => {
      scope.controller.abort();
      if (scopeRef.current === scope) scopeRef.current = null;
    };
  }, [authEpoch, captureRequest, canSync, enqueue, session?.sessionId, syncGeneration, userId]);

  const setTheme = useCallback((theme: ThemePreference) => {
    revisionRef.current += 1;
    dirtyRef.current = true;
    void applyLocal({ theme, updatedAt: Date.now() }).then(saved => {
      if (saved) void enqueue(true);
    });
  }, [applyLocal, enqueue]);

  const setSyncEnabled = useCallback((enabled: boolean) => {
    revisionRef.current += 1;
    // React can batch off → on into the same rendered boolean. The old scope
    // was still revoked, so an explicit generation must recreate it.
    setSyncGeneration(++syncGenerationRef.current);
    if (!enabled) {
      scopeRef.current?.controller.abort();
      scopeRef.current = null;
      setSyncing(false);
    }
    void applyLocal({ syncEnabled: enabled });
  }, [applyLocal]);

  const retryCloudSync = useCallback(() => enqueue(false), [enqueue]);

  const value = useMemo(
    () => ({
      cloudError,
      cloudSyncAvailable,
      canSync,
      canSyncNow,
      isCurrentSyncScope,
      isReady,
      localStatus,
      localError,
      preferences,
      retryLocal,
      retryCloudSync,
      setSyncEnabled,
      setTheme,
      syncing,
    }),
    [
      cloudError,
      cloudSyncAvailable,
      canSync,
      canSyncNow,
      isCurrentSyncScope,
      isReady,
      localStatus,
      localError,
      preferences,
      retryLocal,
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
