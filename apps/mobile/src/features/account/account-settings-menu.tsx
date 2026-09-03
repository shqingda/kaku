// 「设置与本地」菜单组：外观与同步、清理本地数据、诊断与网络诊断。
import { useMemo, useState } from 'react';
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
import { clearDiagnosticRecords } from '@/lib/diagnostic-log';

export function AccountSettingsMenu() {
  const colors = useTheme();
  const styles = useMemo(() => createMenuGroupStyles(colors), [colors]);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const queryClient = useQueryClient();
  const { clearHistory: clearRecentSubjects } = useRecentSubjects();
  const { clearHistory: clearSearchHistory } = useSearchHistory();

  async function clearLocalData() {
    setIsClearingLocalData(true);
    try {
      queryClient.removeQueries({
        predicate: (query) => query.meta?.persist === true,
      });

      const results = await Promise.allSettled([
        queryPersister.removeClient(),
        clearOfflineSubjectPack(),
        clearSearchHistory(),
        clearRecentSubjects(),
        clearDiagnosticRecords(),
        Image.clearMemoryCache(),
        Image.clearDiskCache(),
      ]);

      if (results.some((result) => result.status === 'rejected')) {
        Alert.alert('部分数据未能清理', '可以稍后再试，不影响继续使用。');
        return;
      }

      Alert.alert(
        '已清理',
        '公开缓存、离线包、图片、最近记录和诊断信息已清理；最近搜索和浏览也会同步清除。',
      );
    } finally {
      setIsClearingLocalData(false);
    }
  }

  function confirmClearLocalData() {
    Alert.alert(
      '清理本地数据？',
      '将删除公开内容缓存、图片缓存、最近搜索、最近浏览和诊断记录。最近搜索和浏览会从其他 Kaku 设备同步清除；不会退出登录，也不会修改 Bangumi 收藏。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void clearLocalData(),
          text: '清理',
        },
      ],
    );
  }

  return (
    <>
      <Text style={styles.menuSectionTitle}>设置与本地</Text>
      <View style={styles.menuGroup}>
        <AccountMenuRow
          colors={colors}
          description="深色、浅色与云端同步"
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
          description="公开缓存、图片与最近记录"
          hasDivider
          icon={{
            android: 'delete_sweep',
            ios: 'trash',
            web: 'delete_sweep',
          }}
          label="清理本地数据"
          loading={isClearingLocalData}
          onPress={confirmClearLocalData}
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
    </>
  );
}
