// 通用设置与帮助入口，访客也可以访问。
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

import { CacheClearIndicator, type CacheClearStatus } from './cache-clear-indicator';

import { useAppUpdate } from '@/features/app-update/update-provider';

export function AccountSettingsMenu() {
  const update = useAppUpdate();
  const checkOnOpen = useRef(update.check);
  useEffect(() => { void checkOnOpen.current(false); }, []);
  const colors = useTheme();
  const styles = useMemo(() => createMenuGroupStyles(colors), [colors]);
  const [cacheStatus, setCacheStatus] = useState<CacheClearStatus>('idle');
  useEffect(() => {
    if (cacheStatus !== 'success') return;
    const timer = setTimeout(() => setCacheStatus('idle'), 2400);
    return () => clearTimeout(timer);
  }, [cacheStatus]);
  const queryClient = useQueryClient();
  const cacheBusy = useRef(false);

  async function clearLocalData() {
    if (cacheBusy.current) return;
    cacheBusy.current = true;
    setCacheStatus('clearing');
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
      setCacheStatus('success');
    } catch {
      setCacheStatus('error');
    } finally {
      cacheBusy.current = false;
    }
  }

  return (
    <>
      <Text style={styles.menuSectionTitle}>通用设置</Text>
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
          description={cacheStatus === 'error' ? '部分缓存未能清理，点击重试' : cacheStatus === 'success' ? '缓存已清理，历史和草稿已保留' : '内容、图片与自动离线包，保留历史和草稿'}
          hasDivider
          icon={{
            android: 'delete_sweep',
            ios: 'trash',
            web: 'delete_sweep',
          }}
          label="清理缓存"
          loading={cacheStatus === 'clearing'}
          statusText={cacheStatus === 'clearing' ? '正在清理' : cacheStatus === 'success' ? '清理成功' : cacheStatus === 'error' ? '清理失败，点击重试' : undefined}
          trailing={<CacheClearIndicator status={cacheStatus} color={colors.accent} />}
          showChevron={false}
          onPress={() => void clearLocalData()}
        />
      </View>
      <Text style={styles.menuSectionTitle}>帮助与关于</Text>
      <View style={styles.menuGroup}>
        <AccountMenuRow
          colors={colors}
          description="Bangumi 服务状态与本机连通性"
          icon={{
            android: 'network_check',
            ios: 'antenna.radiowaves.left.and.right',
            web: 'network_check',
          }}
          label="网络诊断"
          onPress={() => router.push('/network-status')}
        />
        <AccountMenuRow
          colors={colors}
          hasDivider
          description="检测是否有新版本"
          icon={{ android: 'system_update', ios: 'arrow.down.circle', web: 'system_update' }}
          label="检查更新"
          loading={update.state.status === 'checking'}
          showChevron={false}
          onPress={() => void update.check()}
        />
        <AccountMenuRow
          colors={colors}
          description="版本、更新日志、帮助与隐私"
          hasDivider
          icon={{ android: 'info', ios: 'info.circle', web: 'info' }}
          label="关于 Kaku"
          onPress={() => router.push('/about')}
        />
      </View>
    </>
  );
}
