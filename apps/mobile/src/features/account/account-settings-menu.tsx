// 「设置与本地」菜单组：外观与同步、清理缓存、诊断与网络诊断。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { AccountMenuRow, createMenuGroupStyles } from './account-menu-row';
import { useTheme } from '@/features/theme/theme-provider';
import { clearOfflineSubjectPack } from '@/features/catalog/offline-subject-pack';
import { queryPersister } from '@/lib/query-persister';
import { useClearHistoryAction } from '@/features/history/use-clear-history-action';
import { AppActionMenu } from '@/features/shared/app-action-menu';

import { useAppUpdate } from '@/features/app-update/update-provider';

export function AccountSettingsMenu() {
  const update = useAppUpdate();
  const checkOnOpen = useRef(update.check);
  useEffect(() => { void checkOnOpen.current(false); }, []);
  const colors = useTheme();
  const styles = useMemo(() => createMenuGroupStyles(colors), [colors]);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const queryClient = useQueryClient();
  const recentSubjects = useRecentSubjects();
  const searchHistory = useSearchHistory();
  const confirmClearHistory = useClearHistoryAction();
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const clearingHistory = recentSubjects.isClearing || searchHistory.isClearing;
  const cacheBusy = useRef(false);

  async function clearLocalData() {
    if (cacheBusy.current) return;
    cacheBusy.current = true;
    setIsClearingLocalData(true);
    try {
      await queryClient.cancelQueries({ predicate: (query) => query.meta?.persist === true });
      queryClient.removeQueries({ predicate: (query) => query.meta?.persist === true });
      const results = await Promise.allSettled([
        queryPersister.removeClient(),
        clearOfflineSubjectPack(),
        Image.clearMemoryCache(),
        Image.clearDiskCache(),
      ]);
      if (results.some((result) => result.status === 'rejected' || result.value === false)) {
        throw new Error('部分缓存未能清理');
      }
      Alert.alert('缓存已清理', '内容和图片可重新读取；历史、草稿、偏好和登录已保留。');
    } catch {
      Alert.alert('部分缓存未能清理', '可以重试，不影响继续使用。', [
        { text: '关闭', style: 'cancel' },
        { text: '重试', onPress: () => void clearLocalData() },
      ]);
    } finally {
      cacheBusy.current = false;
      setIsClearingLocalData(false);
    }
  }

  function confirmClearLocalData() {
    Alert.alert('清理缓存？',
      '将移除本机内容缓存、图片和自动离线包，之后需要联网重新读取。历史、草稿、偏好和登录会保留。', [
        { style: 'cancel', text: '取消' },
        { onPress: () => void clearLocalData(), text: '清理' },
      ]);
  }

  return (
    <>
      <Text style={styles.menuSectionTitle}>设置与本地</Text>
      <View style={styles.menuGroup}>
        <AccountMenuRow
          colors={colors}
          description="检测是否有新版本"
          icon={{ android: 'system_update', ios: 'arrow.down.circle', web: 'system_update' }}
          label="检查更新"
          loading={update.state.status === 'checking'}
          showChevron={false}
          onPress={() => void update.check()}
        />
        <AccountMenuRow
          colors={colors}
          description="深色、浅色与云端同步"
          hasDivider
          icon={{
            android: 'cloud',
            ios: 'icloud',
            web: 'cloud',
          }}
          label="外观与同步"
          onPress={() => router.push('/settings')}
        />
        <AccountMenuRow
          colors={colors}
          description="查看自动保存的条目及保存时间"
          hasDivider
          icon={{ android: 'download', ios: 'arrow.down.circle', web: 'download' }}
          label="离线内容"
          onPress={() => router.push('/offline-content')}
        />
        <AccountMenuRow
          colors={colors}
          description="内容、图片与自动离线包，保留历史和草稿"
          hasDivider
          icon={{
            android: 'delete_sweep',
            ios: 'trash',
            web: 'delete_sweep',
          }}
          label="清理缓存"
          loading={isClearingLocalData}
          onPress={confirmClearLocalData}
        />
        <AccountMenuRow
          colors={colors}
          description="分别清除搜索或浏览记录"
          hasDivider
          icon={{ android: 'history', ios: 'clock.arrow.circlepath', web: 'history' }}
          label="管理历史记录"
          loading={clearingHistory}
          onPress={() => setHistoryMenuOpen(true)}
        />
        <AccountMenuRow
          colors={colors}
          description="查看仅保存在本机的错误记录"
          hasDivider
          icon={{
            android: 'troubleshoot',
            ios: 'waveform.path.ecg',
            web: 'troubleshoot',
          }}
          label="诊断信息"
          onPress={() => router.push('/diagnostics')}
        />
        <AccountMenuRow
          colors={colors}
          description="Bangumi 服务状态与本机连通性"
          hasDivider
          icon={{
            android: 'network_check',
            ios: 'antenna.radiowaves.left.and.right',
            web: 'network_check',
          }}
          label="网络诊断"
          onPress={() => router.push('/network-status')}
        />
      </View>
      <AppActionMenu
        title="管理历史记录"
        visible={historyMenuOpen}
        onClose={() => setHistoryMenuOpen(false)}
        actions={[
          { id: 'search', label: '清除搜索历史', symbol: { ios: 'magnifyingglass', android: 'search', web: 'search' }, onPress: () => confirmClearHistory('search', searchHistory) },
          { id: 'browse', label: '清除浏览历史', symbol: { ios: 'clock', android: 'history', web: 'history' }, onPress: () => confirmClearHistory('browse', recentSubjects) },
        ]}
      />
    </>
  );
}
