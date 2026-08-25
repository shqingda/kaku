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
import { parseSearchHistoryResponse } from '@/infrastructure/kaku/search-history-client';
import { userErrorMessage } from '@/lib/user-error-message';
import { loadSearchHistory, saveSearchHistory } from './search-history';
import {
  addRecentSearch,
  mergeSearchHistory,
  type SearchHistoryRecord,
} from './search-history-model';

type SearchHistoryContextValue = {
  addSearch: (keyword: string) => void;
  clearHistory: () => Promise<void>;
  cloudError: string | null;
  items: string[];
  refreshFromCloud: () => Promise<void>;
  retryCloudSync: () => Promise<void>;
  syncIfStale: () => Promise<void>;
  syncing: boolean;
};

const PULL_DEDUPLICATION_MS = 2_000;

const SearchHistoryContext =
  createContext<SearchHistoryContextValue | null>(null);

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const { request, session } = useAuth();
  const [record, setRecord] = useState<SearchHistoryRecord>({
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
    void loadSearchHistory().then((loaded) => {
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
    async (next: SearchHistoryRecord) => {
      if (!session) return;
      setSyncing(true);
      try {
        const response = await request('/me/search-history', {
          body: JSON.stringify({ items: next.items }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        });
        const saved = await parseSearchHistoryResponse(response);
        if (recordRef.current.updatedAt === next.updatedAt) {
          recordRef.current = saved;
          setRecord(saved);
          await saveSearchHistory(saved);
        }
        setCloudError(null);
      } catch (error) {
        setCloudError(
          userErrorMessage(error, '搜索历史暂未同步，可稍后重试。'),
        );
      } finally {
        setSyncing(false);
      }
    },
    [request, session],
  );

  const enqueuePush = useCallback(
    (next: SearchHistoryRecord) => {
      writeChainRef.current = writeChainRef.current
        .catch(() => undefined)
        .then(() => pushToCloud(next));
      return writeChainRef.current;
    },
    [pushToCloud],
  );

  const performCloudSync = useCallback(async () => {
    if (!session) return;
    setSyncing(true);
    try {
      const cloud = await parseSearchHistoryResponse(
        await request('/me/search-history'),
      );
      const merged = mergeSearchHistory(recordRef.current, cloud);
      recordRef.current = merged.record;
      setRecord(merged.record);
      await saveSearchHistory(merged.record);
      setCloudError(null);
      if (merged.pushToCloud) await enqueuePush(merged.record);
    } catch (error) {
      setCloudError(userErrorMessage(error, '搜索历史同步失败，请稍后重试。'));
    } finally {
      setSyncing(false);
    }
  }, [enqueuePush, request, session]);

  const pullFromCloud = useCallback(
    (force = false) => {
      if (!session) return Promise.resolve();
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
    [performCloudSync, session],
  );

  useEffect(() => {
    if (!session) {
      setCloudError(null);
      return;
    }
    if (ready) void pullFromCloud(true);
  }, [pullFromCloud, ready, session]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const becameActive =
        previousState !== 'active' && nextState === 'active';
      previousState = nextState;

      if (becameActive && ready && session) {
        void pullFromCloud();
      }
    });

    return () => subscription.remove();
  }, [pullFromCloud, ready, session]);

  const updateLocal = useCallback(
    (items: string[]) => {
      const next = { items, updatedAt: Date.now() };
      recordRef.current = next;
      setRecord(next);
      void saveSearchHistory(next);
      if (session) void enqueuePush(next);
    },
    [enqueuePush, session],
  );

  const addSearch = useCallback(
    (keyword: string) => {
      updateLocal(addRecentSearch(recordRef.current.items, keyword));
    },
    [updateLocal],
  );

  const clearHistory = useCallback(async () => {
    const next = { items: [], updatedAt: Date.now() };
    recordRef.current = next;
    setRecord(next);
    await saveSearchHistory(next);
    if (session) void enqueuePush(next);
  }, [enqueuePush, session]);

  const value = useMemo(
    () => ({
      addSearch,
      clearHistory,
      cloudError,
      items: record.items,
      refreshFromCloud: () => pullFromCloud(true),
      retryCloudSync: () => pullFromCloud(true),
      syncIfStale: () => pullFromCloud(false),
      syncing,
    }),
    [
      addSearch,
      clearHistory,
      cloudError,
      record.items,
      pullFromCloud,
      syncing,
    ],
  );

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  const context = useContext(SearchHistoryContext);
  if (!context) {
    throw new Error('useSearchHistory must be used inside SearchHistoryProvider');
  }
  return context;
}
