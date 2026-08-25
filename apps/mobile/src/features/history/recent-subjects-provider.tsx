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
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { parseRecentSubjectsResponse } from '@/infrastructure/kaku/recent-subjects-client';
import { userErrorMessage } from '@/lib/user-error-message';

import { loadRecentSubjects, saveRecentSubjects } from './recent-subjects';
import {
  addRecentSubject,
  mergeRecentSubjects,
  type RecentSubject,
  type RecentSubjectsRecord,
} from './recent-subjects-model';

type RecentSubjectsContextValue = {
  clearHistory: () => Promise<void>;
  cloudError: string | null;
  items: RecentSubject[];
  refreshFromCloud: () => Promise<void>;
  rememberSubject: (subject: RecentSubject) => void;
  retryCloudSync: () => Promise<void>;
  syncIfStale: () => Promise<void>;
  syncing: boolean;
};

const PULL_DEDUPLICATION_MS = 2_000;

const RecentSubjectsContext =
  createContext<RecentSubjectsContextValue | null>(null);

export function RecentSubjectsProvider({ children }: { children: ReactNode }) {
  const { request, session } = useAuth();
  const { preferences } = usePreferences();
  const syncEnabled = preferences.syncEnabled;
  const [record, setRecord] = useState<RecentSubjectsRecord>({
    items: [],
    updatedAt: null,
  });
  const [ready, setReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const recordRef = useRef(record);
  const lastPullAtRef = useRef(0);
  const pullPromiseRef = useRef<Promise<void> | null>(null);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void loadRecentSubjects().then((loaded) => {
      if (!active) return;
      recordRef.current = loaded;
      setRecord(loaded);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const pushToCloud = useCallback(
    async (next: RecentSubjectsRecord) => {
      if (!session || !syncEnabled) return;
      setSyncing(true);
      try {
        const response = await request('/me/recent-subjects', {
          body: JSON.stringify({ items: next.items }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        });
        const saved = await parseRecentSubjectsResponse(response);
        if (recordRef.current.updatedAt === next.updatedAt) {
          recordRef.current = saved;
          setRecord(saved);
          await saveRecentSubjects(saved);
        }
        setCloudError(null);
      } catch (error) {
        setCloudError(
          userErrorMessage(error, '最近浏览暂未同步，可稍后重试。'),
        );
      } finally {
        setSyncing(false);
      }
    },
    [request, session, syncEnabled],
  );

  const enqueuePush = useCallback(
    (next: RecentSubjectsRecord) => {
      writeChainRef.current = writeChainRef.current
        .catch(() => undefined)
        .then(() => pushToCloud(next));
      return writeChainRef.current;
    },
    [pushToCloud],
  );

  const performCloudSync = useCallback(async () => {
    if (!session || !syncEnabled) return;
    setSyncing(true);
    try {
      const cloud = await parseRecentSubjectsResponse(
        await request('/me/recent-subjects'),
      );
      const merged = mergeRecentSubjects(recordRef.current, cloud);
      recordRef.current = merged.record;
      setRecord(merged.record);
      await saveRecentSubjects(merged.record);
      setCloudError(null);
      if (merged.pushToCloud) await enqueuePush(merged.record);
    } catch (error) {
      setCloudError(
        userErrorMessage(error, '最近浏览同步失败，请稍后重试。'),
      );
    } finally {
      setSyncing(false);
    }
  }, [enqueuePush, request, session, syncEnabled]);

  const pullFromCloud = useCallback(
    (force = false) => {
      if (!session || !syncEnabled) return Promise.resolve();
      if (pullPromiseRef.current) return pullPromiseRef.current;
      if (
        !force &&
        Date.now() - lastPullAtRef.current < PULL_DEDUPLICATION_MS
      ) {
        return Promise.resolve();
      }

      lastPullAtRef.current = Date.now();
      const task = performCloudSync().finally(() => {
        pullPromiseRef.current = null;
      });
      pullPromiseRef.current = task;
      return task;
    },
    [performCloudSync, session, syncEnabled],
  );

  useEffect(() => {
    if (!session || !syncEnabled) {
      setCloudError(null);
      return;
    }
    if (ready) void pullFromCloud(true);
  }, [pullFromCloud, ready, session, syncEnabled]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const becameActive =
        previousState !== 'active' && nextState === 'active';
      previousState = nextState;

      if (becameActive && ready) void pullFromCloud();
    });

    return () => subscription.remove();
  }, [pullFromCloud, ready]);

  const updateLocal = useCallback(
    (items: RecentSubject[]) => {
      const next = { items, updatedAt: Date.now() };
      recordRef.current = next;
      setRecord(next);
      void saveRecentSubjects(next);
      if (session && syncEnabled) void enqueuePush(next);
    },
    [enqueuePush, session, syncEnabled],
  );

  const rememberSubject = useCallback(
    (subject: RecentSubject) => {
      updateLocal(addRecentSubject(recordRef.current.items, subject));
    },
    [updateLocal],
  );

  const clearHistory = useCallback(async () => {
    const next = { items: [], updatedAt: Date.now() };
    recordRef.current = next;
    setRecord(next);
    await saveRecentSubjects(next);
    if (session && syncEnabled) void enqueuePush(next);
  }, [enqueuePush, session, syncEnabled]);

  const value = useMemo(
    () => ({
      clearHistory,
      cloudError,
      items: record.items,
      refreshFromCloud: () => pullFromCloud(true),
      rememberSubject,
      retryCloudSync: () => pullFromCloud(true),
      syncIfStale: () => pullFromCloud(false),
      syncing,
    }),
    [
      clearHistory,
      cloudError,
      pullFromCloud,
      record.items,
      rememberSubject,
      syncing,
    ],
  );

  return (
    <RecentSubjectsContext.Provider value={value}>
      {children}
    </RecentSubjectsContext.Provider>
  );
}

export function useRecentSubjects() {
  const context = useContext(RecentSubjectsContext);
  if (!context) {
    throw new Error(
      'useRecentSubjects must be used inside RecentSubjectsProvider',
    );
  }
  return context;
}
