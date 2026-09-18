import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { userErrorMessage } from '@/lib/user-error-message';

type HistoryRecord<T> = { items: T[]; updatedAt: number | null };
type HistoryOptions<T> = {
  path: string;
  errorMessage: string;
  load: (userId: number | undefined) => Promise<HistoryRecord<T>>;
  save: (record: HistoryRecord<T>, userId: number | undefined) => Promise<void>;
  parse: (response: Response) => Promise<HistoryRecord<T>>;
  merge: (local: HistoryRecord<T>, cloud: HistoryRecord<T>) => {
    record: HistoryRecord<T>;
    pushToCloud: boolean;
  };
};

type CloudScope = {
  controller: AbortController;
  queue: Promise<void>;
  pull: Promise<void> | null;
  lastPullAt: number;
};

// Only the two history features share this policy: account-owned snapshots,
// local-first edits, serialized cloud operations, and foreground refresh.
export function useSyncedHistory<T>(options: HistoryOptions<T>) {
  const { request, session, isLoading } = useAuth();
  const { preferences, isReady, cloudSyncAvailable } = usePreferences();
  const userId = session?.user.id;
  const enabled = isReady && cloudSyncAvailable && preferences.syncEnabled;
  const [state, setState] = useState<{
    userId: number | undefined;
    ready: boolean;
    record: HistoryRecord<T>;
  }>({
    userId,
    ready: false,
    record: { items: [], updatedAt: null },
  });
  const stateRef = useRef(state);
  const dirtyRef = useRef(false);
  const identityRef = useRef(userId);
  identityRef.current = userId;
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const cloudRef = useRef<CloudScope | null>(null);
  const localWrites = useRef(Promise.resolve());

  const persist = useCallback((record: HistoryRecord<T>, owner: number | undefined) => {
    const task = localWrites.current
      .catch(() => undefined)
      .then(() => options.save(record, owner));
    localWrites.current = task;
    return task;
  }, [options]);

  const apply = useCallback((record: HistoryRecord<T>) => {
    const next = { userId, ready: true, record };
    stateRef.current = next;
    setState(next);
    return persist(record, userId);
  }, [persist, userId]);

  useEffect(() => {
    if (isLoading) return;
    if (stateRef.current.userId === userId && stateRef.current.ready) return;
    let active = true;
    const initial: typeof state = {
      userId, ready: false, record: { items: [], updatedAt: null },
    };
    dirtyRef.current = false;
    stateRef.current = initial;
    setState(initial);
    void options.load(userId).then((record) => {
      // An edit made during hydration is more recent than the stored snapshot.
      if (!active || stateRef.current !== initial) return;
      const next = { userId, ready: true, record };
      stateRef.current = next;
      setState(next);
    });
    return () => { active = false; };
  }, [isLoading, options, userId]);

  useEffect(() => {
    setCloudError(null);
    setSyncing(false);
    if (
      !enabled || isLoading || userId === undefined ||
      !state.ready || state.userId !== userId
    ) return;
    const scope: CloudScope = {
      controller: new AbortController(),
      queue: Promise.resolve(),
      pull: null,
      lastPullAt: 0,
    };
    cloudRef.current = scope;
    return () => {
      scope.controller.abort();
      if (cloudRef.current === scope) cloudRef.current = null;
    };
  }, [enabled, isLoading, state.ready, state.userId, userId]);

  const enqueue = useCallback((operation: (scope: CloudScope, current: () => boolean) => Promise<void>) => {
    const scope = cloudRef.current;
    if (!scope) return Promise.resolve();
    const current = () =>
      cloudRef.current === scope &&
      !scope.controller.signal.aborted &&
      identityRef.current === userId;
    scope.queue = scope.queue.then(async () => {
      if (!current()) return;
      setSyncing(true);
      try {
        await operation(scope, current);
        if (current()) setCloudError(null);
      } catch (error) {
        if (current()) setCloudError(userErrorMessage(error, options.errorMessage));
      } finally {
        if (current()) setSyncing(false);
      }
    });
    return scope.queue;
  }, [options, userId]);

  const push = useCallback(async (record: HistoryRecord<T>, scope: CloudScope, current: () => boolean) => {
    if (!current()) return;
    const saved = await options.parse(await request(options.path, {
      body: JSON.stringify({ items: record.items }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT', signal: scope.controller.signal,
    }));
    if (current() && stateRef.current.record === record) {
      dirtyRef.current = false;
      await apply(saved);
    }
  }, [apply, options, request]);

  const pullFromCloud = useCallback((force = false) => {
    const scope = cloudRef.current;
    if (!scope) return Promise.resolve();
    if (scope.pull) return scope.pull;
    if (!force && Date.now() - scope.lastPullAt < 2_000) return Promise.resolve();
    scope.lastPullAt = Date.now();
    scope.pull = enqueue(async (scope, current) => {
      const before = stateRef.current.record;
      if (dirtyRef.current) {
        await push(before, scope, current);
        return;
      }
      const cloud = await options.parse(await request(options.path, {
        signal: scope.controller.signal,
      }));
      if (!current() || stateRef.current.record !== before) return;
      const merged = options.merge(before, cloud);
      await apply(merged.record);
      if (merged.pushToCloud) await push(merged.record, scope, current);
    }).finally(() => { scope.pull = null; });
    return scope.pull;
  }, [apply, enqueue, options, push, request]);

  useEffect(() => {
    void pullFromCloud(true);
  }, [enabled, isLoading, state.ready, state.userId, userId, pullFromCloud]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active') void pullFromCloud();
      previous = next;
    });
    return () => subscription.remove();
  }, [pullFromCloud]);

  const updateItems = useCallback(async (update: (items: T[]) => T[]) => {
    if (isLoading || identityRef.current !== userId) return;
    const previous = stateRef.current.userId === userId
      ? stateRef.current.record
      : { items: [], updatedAt: null };
    const next = { items: update(previous.items), updatedAt: Date.now() };
    dirtyRef.current = true;
    const saved = apply(next);
    void enqueue((scope, current) => push(next, scope, current));
    await saved;
  }, [apply, enqueue, isLoading, push, userId]);

  const clearHistory = useCallback(() => updateItems(() => []), [updateItems]);
  const refreshFromCloud = useCallback(() => pullFromCloud(true), [pullFromCloud]);
  const syncIfStale = useCallback(() => pullFromCloud(), [pullFromCloud]);

  return {
    items: state.userId === userId ? state.record.items : [],
    cloudError,
    syncing,
    updateItems,
    clearHistory,
    refreshFromCloud,
    retryCloudSync: refreshFromCloud,
    syncIfStale,
  };
}
