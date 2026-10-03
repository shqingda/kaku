import { useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import type { HistoryLocalStatus } from './use-synced-history';

type ClearTarget = {
  clearHistory: () => Promise<void>;
  localStatus: HistoryLocalStatus;
  isClearing: boolean;
};

// The account menu and overview must describe the same deletion scope.
export function useClearHistoryAction() {
  const { session } = useAuth();
  const { preferences, cloudSyncAvailable } = usePreferences();
  const userId = session?.user.id;
  const syncEnabled = preferences.syncEnabled;
  const scope = useMemo(() => ({ userId, syncEnabled, cloudSyncAvailable }), [userId, syncEnabled, cloudSyncAvailable]);
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const busy = useRef<typeof scope | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  return function confirmClearHistory(kind: 'search' | 'browse', history: ClearTarget) {
    if (history.isClearing || busy.current === scope) return;
    if (history.localStatus === 'loading' || history.localStatus === 'read-error') {
      Alert.alert('请先恢复历史记录', '重试读取成功后，再清除这一类历史。');
      return;
    }
    const label = kind === 'search' ? '搜索历史' : '浏览历史';
    const effect = userId === undefined
      ? '只清除本机访客的记录。'
      : syncEnabled && cloudSyncAvailable
        ? '删除会同步到此账号的其他 Kaku 设备。'
        : '当前只清除本机此账号的记录；以后恢复云同步时，删除可能同步到其他设备。';
    const current = () => mounted.current && latestScope.current === scope;
    async function run() {
      if (!mounted.current || busy.current === scope) return;
      if (!current()) {
        Alert.alert('账号或同步设置已变化', '请重新选择要清除的历史。');
        return;
      }
      busy.current = scope;
      try {
        await history.clearHistory();
        if (current()) Alert.alert(`${label}已在本机清除`, userId !== undefined && syncEnabled && cloudSyncAvailable
          ? '云端处理状态可在“外观与同步”中查看，失败时可重试同步。' : effect);
      } catch {
        if (current()) Alert.alert('历史未能清除', '原记录仍保留，可以重试。', [
          { text: '关闭', style: 'cancel' }, { text: '重试', onPress: run },
        ]);
      } finally {
        if (busy.current === scope) busy.current = null;
      }
    }
    Alert.alert(`清除${label}？`, `${effect}不会影响另一类历史、草稿或 Bangumi 收藏。`, [
      { text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: run },
    ]);
  };
}
