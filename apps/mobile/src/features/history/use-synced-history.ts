import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { userErrorMessage } from '@/lib/user-error-message';

type HistoryRecord<T> = { items: T[]; updatedAt: number | null };
export type HistoryLocalStatus = 'loading' | 'ready' | 'read-error' | 'write-error';
type HistoryOptions<T> = {
  path: string;
  errorMessage: string;
  load: (userId: number | undefined) => Promise<HistoryRecord<T>>;
  save: (record: HistoryRecord<T>, userId: number | undefined) => Promise<void>;
  parse: (response: Response) => Promise<HistoryRecord<T>>;
  applyPending: (stored: T[], pending: T[]) => T[];
  merge: (local: HistoryRecord<T>, cloud: HistoryRecord<T>) => {
    record: HistoryRecord<T>;
    pushToCloud: boolean;
  };
};
type LocalScope<T> = {
  userId: number | undefined;
  active: boolean;
  hydrated: boolean;
  record: HistoryRecord<T>;
  pending: HistoryRecord<T>;
  status: HistoryLocalStatus;
  error: string | null;
  revision: number;
  dirty: boolean;
  recovery: Promise<boolean> | null;
  clear: Promise<void> | null;
  clearing: boolean;
};
type CloudScope = {
  controller: AbortController;
  queue: Promise<void>;
  pull: Promise<void> | null;
  lastPullAt: number;
};
const READ_ERROR = '历史暂时无法读取，新记录暂存在当前窗口。原记录已保留，请重试读取。';
const WRITE_ERROR = '历史未能保存到本机，当前窗口的记录仍可使用，请重试保存。';

// Local work is serialized per account. A new scope invalidates callbacks from
// an earlier session, including A → B → A; the storage keys themselves stay v2.
export function useSyncedHistory<T>(options: HistoryOptions<T>) {
  const { request, session, isLoading } = useAuth();
  const { preferences, isReady, cloudSyncAvailable } = usePreferences();
  const userId = session?.user.id;
  const enabled = isReady && cloudSyncAvailable && preferences.syncEnabled && !isLoading;
  const local = useMemo<LocalScope<T>>(() => ({
    userId, active: true, hydrated: false,
    record: { items: [], updatedAt: null }, pending: { items: [], updatedAt: null },
    status: 'loading', error: null, revision: 0, dirty: false,
    recovery: null, clear: null, clearing: false,
  }), [userId, isLoading]);
  const localRef = useRef(local);
  localRef.current = local;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const [view, setView] = useState({ ...local, scope: local });
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const cloudRef = useRef<CloudScope | null>(null);
  const localQueues = useRef(new Map<number | undefined, Promise<unknown>>());

  const currentLocal = useCallback((scope: LocalScope<T>) =>
    localRef.current === scope && scope.active, []);
  const publish = useCallback((scope: LocalScope<T>) => {
    if (currentLocal(scope)) setView({ ...scope, scope });
  }, [currentLocal]);
  const enqueueLocal = useCallback(<R,>(scope: LocalScope<T>, operation: () => Promise<R>) => {
    const previous = localQueues.current.get(scope.userId) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(async () => {
      if (!currentLocal(scope)) throw new Error('历史所属账号已变化');
      return operation();
    });
    // Keep a settled queue even when the caller handles a failure separately.
    localQueues.current.set(scope.userId, task.catch(() => undefined));
    return task;
  }, [currentLocal]);
  const save = useCallback(async (scope: LocalScope<T>, record: HistoryRecord<T>, failure = WRITE_ERROR) => {
    try {
      await options.save(record, scope.userId);
      if (currentLocal(scope)) { scope.status = 'ready'; scope.error = null; }
    } catch (error) {
      if (currentLocal(scope)) { scope.status = 'write-error'; scope.error = failure; publish(scope); }
      throw error;
    }
  }, [currentLocal, options, publish]);

  const enqueueCloud = useCallback((operation: (scope: CloudScope, current: () => boolean) => Promise<void>) => {
    const scope = cloudRef.current;
    if (!scope) return Promise.resolve();
    const current = () => currentLocal(local) && enabledRef.current &&
      cloudRef.current === scope && !scope.controller.signal.aborted && local.status === 'ready';
    scope.queue = scope.queue.then(async () => {
      await localQueues.current.get(local.userId);
      if (!current()) return;
      setSyncing(true);
      try {
        await operation(scope, current);
        if (current()) setCloudError(null);
      } catch (error) {
        if (current()) setCloudError(userErrorMessage(error, options.errorMessage));
      } finally {
        if (currentLocal(local) && cloudRef.current === scope) setSyncing(false);
      }
    });
    return scope.queue;
  }, [currentLocal, local, options]);

  const push = useCallback(async (record: HistoryRecord<T>, revision: number, scope: CloudScope, current: () => boolean) => {
    if (!current() || !local.dirty || local.revision !== revision || local.record !== record) return;
    const saved = await options.parse(await request(options.path, {
      body: JSON.stringify({ items: record.items }), headers: { 'Content-Type': 'application/json' },
      method: 'PUT', signal: scope.controller.signal,
    }));
    await enqueueLocal(local, async () => {
      if (!current() || local.revision !== revision) return;
      await save(local, saved);
      if (!current() || local.revision !== revision) return;
      local.record = saved;
      local.dirty = false;
      publish(local);
    });
  }, [enqueueLocal, local, options, publish, request, save]);
  const upload = useCallback((record: HistoryRecord<T>, revision: number) => {
    void enqueueCloud((scope, current) => push(record, revision, scope, current));
  }, [enqueueCloud, push]);

  const retryLocalHistory = useCallback((): Promise<boolean> => {
    if (!currentLocal(local) || isLoading || local.clearing) return Promise.resolve(false);
    if (local.recovery) return local.recovery;
    if (!local.hydrated) { local.status = 'loading'; local.error = null; publish(local); }
    local.recovery = (async () => {
      if (!local.hydrated) {
        try {
          // Reads share the owner's queue too: returning to A waits for A's
          // previous I/O, while account B remains independent.
          const stored = await enqueueLocal(local, () => options.load(local.userId));
          if (!currentLocal(local)) return false;
          const pending = local.pending;
          local.record = pending.updatedAt === null ? stored : {
            items: options.applyPending(stored.items, pending.items), updatedAt: pending.updatedAt,
          };
          local.dirty = pending.updatedAt !== null;
          local.pending = { items: [], updatedAt: null };
          local.hydrated = true;
        } catch {
          if (currentLocal(local)) { local.status = 'read-error'; local.error = READ_ERROR; publish(local); }
          return false;
        }
      }
      try {
        await enqueueLocal(local, async () => {
          if (local.dirty || local.status === 'write-error') await save(local, local.record);
          else { local.status = 'ready'; local.error = null; }
          publish(local);
        });
        if (!currentLocal(local)) return false;
        upload(local.record, local.revision);
        return true;
      } catch { return false; }
    })().finally(() => { local.recovery = null; });
    return local.recovery;
  }, [currentLocal, enqueueLocal, isLoading, local, options, publish, save, upload]);

  useEffect(() => {
    local.active = true;
    void retryLocalHistory();
    return () => { local.active = false; };
  }, [local, retryLocalHistory]);

  const visible = view.scope === local ? view : local;
  const ready = visible.hydrated && visible.status === 'ready';
  useEffect(() => {
    setCloudError(null);
    setSyncing(false);
    if (!enabled || userId === undefined || !ready) return;
    const scope: CloudScope = { controller: new AbortController(), queue: Promise.resolve(), pull: null, lastPullAt: 0 };
    cloudRef.current = scope;
    return () => {
      scope.controller.abort();
      if (cloudRef.current === scope) cloudRef.current = null;
    };
  }, [enabled, local, ready, userId]);

  const pullFromCloud = useCallback((force = false) => {
    const scope = cloudRef.current;
    if (!scope) return Promise.resolve();
    if (scope.pull) return scope.pull;
    if (!force && Date.now() - scope.lastPullAt < 2_000) return Promise.resolve();
    scope.lastPullAt = Date.now();
    scope.pull = enqueueCloud(async (scope, current) => {
      const before = local.record;
      const revision = local.revision;
      if (local.dirty) { await push(before, revision, scope, current); return; }
      const cloud = await options.parse(await request(options.path, { signal: scope.controller.signal }));
      if (!current() || local.revision !== revision) return;
      const merged = options.merge(before, cloud);
      await enqueueLocal(local, async () => {
        if (!current() || local.revision !== revision) return;
        await save(local, merged.record);
        if (!current() || local.revision !== revision) return;
        local.record = merged.record;
        local.dirty = merged.pushToCloud;
        publish(local);
      });
      if (merged.pushToCloud) await push(merged.record, revision, scope, current);
    }).finally(() => { scope.pull = null; });
    return scope.pull;
  }, [enqueueCloud, enqueueLocal, local, options, publish, push, request, save]);
  useEffect(() => { void pullFromCloud(true); }, [enabled, local, ready, pullFromCloud]);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active') void pullFromCloud();
      previous = next;
    });
    return () => subscription.remove();
  }, [pullFromCloud]);

  const updateItems = useCallback(async (update: (items: T[]) => T[]) => {
    if (!currentLocal(local) || isLoading) return;
    const revision = ++local.revision;
    const updatedAt = Date.now();
    if (!local.hydrated) {
      // Each feature's existing add function bounds and deduplicates this list.
      local.pending = { items: update(local.pending.items), updatedAt };
      publish(local);
      return;
    }
    await enqueueLocal(local, async () => {
      local.record = { items: update(local.record.items), updatedAt };
      local.dirty = true;
      publish(local);
      await save(local, local.record);
      publish(local);
    });
    upload(local.record, revision);
  }, [currentLocal, enqueueLocal, isLoading, local, publish, save, upload]);

  const clearHistory = useCallback((): Promise<void> => {
    if (!currentLocal(local) || !local.hydrated || local.status === 'loading') {
      return Promise.reject(new Error('请先重试读取历史，再清除记录'));
    }
    if (local.clear) return local.clear;
    const revision = ++local.revision;
    const record: HistoryRecord<T> = { items: [], updatedAt: Date.now() };
    local.clearing = true;
    publish(local);
    local.clear = enqueueLocal(local, async () => {
      await save(local, record, '历史未能清除，原记录仍保留。请重新清除或重试保存。');
      if (!currentLocal(local)) return;
      local.record = record;
      local.dirty = true;
      publish(local);
    }).then(() => {
      if (currentLocal(local)) upload(record, revision);
    }).finally(() => {
      local.clearing = false;
      local.clear = null;
      publish(local);
    });
    return local.clear;
  }, [currentLocal, enqueueLocal, local, publish, save, upload]);
  const refreshFromCloud = useCallback(() => pullFromCloud(true), [pullFromCloud]);
  const syncIfStale = useCallback(() => pullFromCloud(), [pullFromCloud]);

  return {
    items: visible.hydrated ? visible.record.items : visible.pending.items,
    localStatus: visible.status,
    localError: visible.error,
    retryLocalHistory,
    isClearing: visible.clearing,
    cloudError, syncing, updateItems, clearHistory, refreshFromCloud,
    retryCloudSync: refreshFromCloud, syncIfStale,
  };
}
