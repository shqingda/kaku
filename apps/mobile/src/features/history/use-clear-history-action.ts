import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import type { HistoryLocalStatus } from './use-synced-history';

type ClearTarget = {
  clearHistory: () => Promise<void>;
  localStatus: HistoryLocalStatus;
  isClearing: boolean;
};

// History sections already display storage errors and offer retry in place.
export function useClearHistoryAction() {
  const { session } = useAuth();
  const { preferences, cloudSyncAvailable, canSync, canSyncNow, isCurrentSyncScope } = usePreferences();
  const userId = session?.user.id;
  const syncEnabled = preferences.syncEnabled;
  const scope = useMemo(() => ({ userId, syncEnabled, cloudSyncAvailable, canSync }), [userId, syncEnabled, cloudSyncAvailable, canSync, isCurrentSyncScope]);
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const busy = useRef<typeof scope | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  return async function clearHistory(history: ClearTarget) {
    if (history.isClearing || busy.current === scope) return;
    if (history.localStatus === 'loading' || history.localStatus === 'read-error') return;
    if (!mounted.current || latestScope.current !== scope
      || !isCurrentSyncScope() || canSyncNow() !== canSync) return;
    busy.current = scope;
    try {
      await history.clearHistory();
    } catch {
      // useSyncedHistory retains the records and exposes the error inline.
    } finally {
      if (busy.current === scope) busy.current = null;
    }
  };
}
