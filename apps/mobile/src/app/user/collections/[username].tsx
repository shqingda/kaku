import { MyCollectionsScreen } from '@/features/collections/my-collections-screen';
import {
  CollectionRow,
  CollectionStatusTabs,
  createCollectionListStyles,
} from '@/features/collections/collection-list-ui';
import { useCallback, useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicUserCollection } from '@/features/users/model';
import { usePublicUserCollections } from '@/features/users/use-public-user';
import type { CollectionStatus } from '@/features/watching/model';

const COLLECTION_STATUSES = new Set<CollectionStatus>([
  'completed',
  'doing',
  'dropped',
  'onHold',
  'wish',
]);

function parseCollectionStatus(value?: string) {
  return value && COLLECTION_STATUSES.has(value as CollectionStatus)
    ? (value as CollectionStatus)
    : undefined;
}

export default function CollectionsScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ username: string; type?: string; status?: string }>();
  if (session?.user.username.toLowerCase() === params.username.toLowerCase()) {
    return <MyCollectionsScreen key={`${session.user.id}:${params.type ?? ''}:${params.status ?? ''}`} userId={session.user.id} initialType={params.type} initialStatus={params.status} />;
  }
  return <PublicUserCollectionsScreen />;
}

function PublicUserCollectionsScreen() {
  const colors = useTheme();
  const styles = createCollectionListStyles(colors);
  const { status, type, username } = useLocalSearchParams<{
    status?: string;
    type?: string;
    username: string;
  }>();
  const initialType = Number(type);
  const [subjectType, setSubjectType] = useState(() =>
    SUBJECT_TYPES.some((item) => item.id === initialType) ? initialType : 2,
  );
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);
  const [collectionStatus, setCollectionStatus] = useState(() =>
    parseCollectionStatus(status),
  );
  // 路由参数变化时同步本地状态（页面被复用时不重新初始化 useState）。
  useEffect(() => {
    const nextType = Number(type);
    if (SUBJECT_TYPES.some((item) => item.id === nextType)) {
      setSubjectType(nextType);
    }
    setCollectionStatus(parseCollectionStatus(status));
  }, [status, type]);
  const collectionStatusLabel = collectionStatus
    ? getCollectionStatusLabel(subjectType, collectionStatus)
    : undefined;
  const collectionsQuery = usePublicUserCollections(
    username,
    subjectType,
    collectionStatus,
  );
  const collections = usePagedList(collectionsQuery);
  const total = collections.total ?? 0;
  const openSubject = useCallback((id: number) => {
    router.push({
      pathname: '/subject/[id]',
      params: { id: String(id) },
    });
  }, []);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: PublicUserCollection }) => (
      <CollectionRow
        isFirst={index === 0}
        isLast={index === collections.items.length - 1}
        item={item}
        onPressItem={openSubject}
      />
    ),
    [collections.items.length, openSubject],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: collectionStatusLabel
            ? `${collectionStatusLabel}的${subjectTypeLabel}`
            : `${subjectTypeLabel}收藏`,
        }}
      />
      <FlatList
        {...collections.listProps}
        contentContainerStyle={styles.content}
        data={collections.items}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          collectionsQuery.isPending ? (
            <AppState
              text={`正在读取公开${subjectTypeLabel}收藏。`}
              title="收藏加载中"
            />
          ) : collectionsQuery.isError ? (
            <AppState
              action={() => void collectionsQuery.refetch()}
              text="请检查网络后重试，已加载的数据不会被覆盖。"
              title="收藏读取失败"
            />
          ) : (
            <AppState
              text={`该用户没有公开${subjectTypeLabel}收藏。`}
              title="暂无收藏"
            />
          )
        }
        ListFooterComponent={
          collections.items.length > 0 ? (
            <PagedListFooter {...collections.footerProps} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>
                {collectionStatusLabel
                  ? `${collectionStatusLabel}的${subjectTypeLabel}`
                  : `${subjectTypeLabel}收藏`}
              </Text>
              <Text style={styles.subtitle}>
                @{username}
                {collectionStatusLabel ? ` · ${collectionStatusLabel}` : ''} ·{' '}
                {total ? `${total} 个条目` : '读取中'}
              </Text>
            </View>
            <SubjectTypeTabs
              contentContainerStyle={styles.subjectTypeTabs}
              onChange={setSubjectType}
              selectedType={subjectType}
            />
            <CollectionStatusTabs
              onChange={(nextStatus) => {
                setCollectionStatus(nextStatus);
                collections.listRef.current?.scrollToOffset({
                  animated: false,
                  offset: 0,
                });
              }}
              selectedStatus={collectionStatus}
              subjectType={subjectType}
            />
            {collections.items.length > 0 && collectionsQuery.isError ? (
              <CachedDataNotice onRetry={() => void collectionsQuery.refetch()} />
            ) : null}
          </>
        }
        maxToRenderPerBatch={12}
        onRefresh={collections.refresh}
        refreshing={collections.refreshing}
        renderItem={renderItem}
        updateCellsBatchingPeriod={40}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={collections.scrollToTop}
        visible={collections.visible}
      />
    </SafeAreaView>
  );
}
