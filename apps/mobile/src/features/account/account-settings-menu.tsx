// 「设置与本地」菜单组：外观与同步、清理缓存与网络诊断。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AccountMenuRow, createMenuGroupStyles } from './account-menu-row';
import { useTheme } from '@/features/theme/theme-provider';
import { clearOfflineSubjectPack } from '@/features/catalog/offline-subject-pack';
import { queryPersister } from '@/lib/query-persister';
import { clearSavedImageFiles } from '@/features/shared/saved-image-files';

import { useAppUpdate } from '@/features/app-update/update-provider';

export function AccountSettingsMenu() {
  const update = useAppUpdate();
  const checkOnOpen = useRef(update.check);
  useEffect(() => { void checkOnOpen.current(false); }, []);
  const colors = useTheme();
  const styles = useMemo(() => createMenuGroupStyles(colors), [colors]);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const queryClient = useQueryClient();
  const [cacheError, setCacheError] = useState(false);
  const cacheBusy = useRef(false);

  async function clearLocalData() {
    if (cacheBusy.current) return;
    cacheBusy.current = true;
    setIsClearingLocalData(true);
    setCacheError(false);
    try {
      await queryClient.cancelQueries({ predicate: (query) => query.meta?.persist === true });
      queryClient.removeQueries({ predicate: (query) => query.meta?.persist === true });
      const results = await Promise.allSettled([
        queryPersister.removeClient(),
        clearOfflineSubjectPack(),
        Image.clearMemoryCache(),
        Image.clearDiskCache(),
        clearSavedImageFiles(),
        update.clearApkCache(),
      ]);
      if (results.some((result) => result.status === 'rejected' || result.value === false)) {
        throw new Error('部分缓存未能清理');
      }
    } catch {
      setCacheError(true);
    } finally {
      cacheBusy.current = false;
      setIsClearingLocalData(false);
    }
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
          description={cacheError ? '部分缓存未能清理，点击重试' : '内容、图片与自动离线包，保留历史和草稿'}
          hasDivider
          icon={{
            android: 'delete_sweep',
            ios: 'trash',
            web: 'delete_sweep',
          }}
          label="清理缓存"
          loading={isClearingLocalData}
          showChevron={false}
          onPress={() => void clearLocalData()}
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
