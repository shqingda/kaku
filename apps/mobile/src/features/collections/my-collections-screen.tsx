import { useCallback, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicUserCollection } from '@/features/users/model';

import { CollectionRowEditor } from './collection-row-editor';
import {
  CollectionRow,
  CollectionStatusTabs,
  COLLECTION_STATUS_OPTIONS,
  createCollectionListStyles,
} from './collection-list-ui';
import {
  collectionSearchStorageKey,
  DEFAULT_COLLECTION_SEARCH,
  parseCollectionSearch,
  searchCollections,
  type CollectionSearchPreferences,
} from './collection-search';
import { useMyCollections } from './use-my-collections';

const LIST_TUNING = {
  initialNumToRender: Platform.OS === 'android' ? 6 : 12,
  maxToRenderPerBatch: Platform.OS === 'android' ? 6 : 12,
  removeClippedSubviews: Platform.OS === 'android',
  updateCellsBatchingPeriod: Platform.OS === 'android' ? 60 : 40,
  windowSize: Platform.OS === 'android' ? 5 : 7,
} as const;

const SEARCH_TYPES = [{ id: 0, label: '全部' }, ...SUBJECT_TYPES];

export function MyCollectionsScreen({
  initialStatus,
  initialType,
  userId,
}: {
  initialStatus?: string;
  initialType?: string;
  userId: number;
}) {
  const colors = useTheme();
  const styles = createCollectionListStyles(colors);
  const { session } = useAuth();
  const key = collectionSearchStorageKey(userId);
  const [initial] = useState(() => {
    try {
      return { preferences: parseCollectionSearch(Storage.getItemSync(key) ?? null), error: '' };
    } catch {
      return { preferences: DEFAULT_COLLECTION_SEARCH, error: '筛选偏好读取失败，本次使用默认条件' };
    }
  });
  const [preferences, setPreferences] = useState<CollectionSearchPreferences>(
    () => ({
      ...initial.preferences,
      ...(initialType &&
      SEARCH_TYPES.some((type) => type.id === Number(initialType))
        ? { subjectType: Number(initialType) }
        : {}),
      ...(COLLECTION_STATUS_OPTIONS.find((status) => status === initialStatus)
        ? { status: initialStatus as CollectionSearchPreferences['status'] }
        : {}),
    }),
  );
  const [storageError, setStorageError] = useState(initial.error);
  const list = useScrollToTopButton();
  const { complete, items, query, total } = useMyCollections();
  const results = searchCollections(items, preferences);
  const paused = query.fetchStatus === 'paused';
  const incomplete = !complete || query.isError;
  const inconsistent = !complete && !query.hasNextPage && !query.isPending && !query.isFetching && !query.isError;
  const subjectTypeLabel = getSubjectTypeLabel(preferences.subjectType);
  const collectionStatusLabel = preferences.status
    ? getCollectionStatusLabel(preferences.subjectType, preferences.status)
    : undefined;
  const title =
    preferences.subjectType === 0
      ? '我的收藏'
      : collectionStatusLabel
        ? `${collectionStatusLabel}的${subjectTypeLabel}`
        : `${subjectTypeLabel}收藏`;

  function persist(next: CollectionSearchPreferences) {
    try {
      Storage.setItemSync(key, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('筛选偏好保存失败，本次选择仍然有效');
    }
  }

  function change(update: Partial<CollectionSearchPreferences>) {
    const next = { ...preferences, ...update };
    setPreferences(next);
    persist(next);
    list.ref.current?.scrollToOffset({ animated: false, offset: 0 });
  }

  function retry() {
    if (query.isFetchNextPageError) {
      void query.fetchNextPage();
      return;
    }
    void query.refetch();
  }

  const subtitle = paused
    ? '当前离线，恢复联网后继续读取'
    : query.isError
      ? '收藏读取失败，当前结果可能不完整'
      : query.isPending && items.length === 0
        ? '正在读取完整收藏'
        : !complete &&
            !query.hasNextPage &&
            !query.isPending &&
            !query.isFetching
          ? '收藏发生变化，请刷新以取得完整结果'
          : incomplete
            ? `已读取 ${items.length}/${total || '…'} 项，搜索结果尚不完整`
            : `${total} 个条目${results.length !== total ? ` · 找到 ${results.length} 项` : ''}`;

  const openSubject = useCallback(
    (id: number) => {
      persist(preferences);
      router.push({
        pathname: '/subject/[id]',
        params: { id: String(id) },
      });
    },
    [preferences],
  );

  const renderItem = useCallback(
    ({ index, item }: { index: number; item: PublicUserCollection }) => (
      <CollectionRow
        isFirst={index === 0}
        isLast={index === results.length - 1}
        item={item}
        onPressItem={openSubject}
        trailing={
          item.collectionStatus === 'doing' ? (
            <CollectionRowEditor item={item} />
          ) : undefined
        }
      />
    ),
    [openSubject, results.length],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title,
        }}
      />
      <FlatList
        {...LIST_TUNING}
        contentContainerStyle={styles.content}
        data={results}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          paused && items.length === 0 ? (
            <AppState title="当前离线" text="恢复联网后继续读取完整收藏。" />
          ) : query.isPending && items.length === 0 ? (
            <AppState
              text="正在读取完整收藏，搜索会覆盖全部条目。"
              title="收藏加载中"
            />
          ) : query.isError && items.length === 0 ? (
            <AppState
              action={retry}
              text="请检查网络后重试，已加载的数据不会被覆盖。"
              title="收藏读取失败"
            />
          ) : incomplete || paused ? null : (
            <AppState
              text="可以换个名称或减少筛选条件。"
              title="没有匹配的收藏"
            />
          )
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Text
                accessibilityRole={query.isError ? 'alert' : undefined}
                style={styles.subtitle}
              >
                {session?.user.username ? `@${session.user.username} · ` : ''}
                {subtitle}
              </Text>
            </View>
            <SubjectSearchField
              accessibilityHint="搜索会覆盖已读取的完整收藏"
              accessibilityLabel="搜索我的完整收藏"
              onChangeText={(keyword) => change({ keyword })}
              onSubmit={() => Keyboard.dismiss()}
              placeholder="搜索中文名或原名"
              style={styles.searchField}
              value={preferences.keyword}
            />
            <SubjectTypeTabs
              contentContainerStyle={styles.subjectTypeTabs}
              onChange={(subjectType) => change({ subjectType })}
              selectedType={preferences.subjectType}
              types={SEARCH_TYPES}
            />
            <CollectionStatusTabs
              onChange={(status) => change({ status })}
              selectedStatus={preferences.status}
              subjectType={preferences.subjectType}
            />
            {items.length > 0 && query.isError ? (
              <CachedDataNotice onRetry={retry} />
            ) : null}
            {inconsistent ? (
              <Pressable accessibilityRole="button" accessibilityLabel="刷新完整收藏" onPress={retry}
                style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ color: colors.accent }}>刷新完整收藏</Text>
              </Pressable>
            ) : null}
            {storageError ? (
              <View>
                <Text accessibilityRole="alert" style={styles.subtitle}>{storageError}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="保存当前筛选" onPress={() => persist(preferences)}
                  style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <Text style={{ color: colors.accent }}>保存当前筛选</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        onRefresh={() => void query.refetch()}
        onScroll={list.handleScroll}
        ref={list.ref}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        renderItem={renderItem}
        scrollEventThrottle={80}
      />
      <ScrollToTopButton onPress={list.scrollToTop} visible={list.visible} />
    </SafeAreaView>
  );
}
