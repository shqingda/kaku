import { useCallback, useState } from 'react';
import { FlatList, Keyboard, Pressable, Text, View } from 'react-native';
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
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { usePagedList } from '@/features/shared/use-paged-list';
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
  type CollectionSearchPreferences,
} from './collection-search';
import { useMyCollections } from './use-my-collections';

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
  const [preferences, setPreferences] = useState<CollectionSearchPreferences>(
    () => {
      let stored = DEFAULT_COLLECTION_SEARCH;
      try {
        stored = parseCollectionSearch(Storage.getItemSync(key) ?? null);
      } catch {
        stored = DEFAULT_COLLECTION_SEARCH;
      }
      return {
        ...stored,
        ...(initialType &&
        SEARCH_TYPES.some((type) => type.id === Number(initialType))
          ? { subjectType: Number(initialType) }
          : {}),
        ...(COLLECTION_STATUS_OPTIONS.find((status) => status === initialStatus)
          ? { status: initialStatus as CollectionSearchPreferences['status'] }
          : {}),
      };
    },
  );
  const { items, notice, query, searching } = useMyCollections(preferences);
  const list = usePagedList(query);
  const results = searching ? items : list.items;
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
    } catch {
      // 筛选只是下次打开的方便，失败不打断当前选择。
    }
  }

  function change(update: Partial<CollectionSearchPreferences>) {
    const next = { ...preferences, ...update };
    setPreferences(next);
    persist(next);
    list.listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }

  function retry() {
    if (query.isFetchNextPageError) {
      void query.fetchNextPage();
      return;
    }
    void query.refetch();
  }

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
        {...list.listProps}
        contentContainerStyle={styles.content}
        data={results}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          notice.empty?.kind === 'error' ? (
            <AppState
              action={retry}
              text={notice.empty.text}
              title={notice.empty.title}
            />
          ) : notice.empty ? (
            <AppState text={notice.empty.text} title={notice.empty.title} />
          ) : null
        }
        ListFooterComponent={
          !searching && results.length > 0 ? (
            <PagedListFooter {...list.footerProps} />
          ) : null
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
                {notice.subtitle}
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
            {notice.showErrorBanner ? (
              <CachedDataNotice onRetry={retry} />
            ) : null}
            {notice.showStaleRefresh ? (
              <Pressable
                accessibilityLabel="刷新完整收藏"
                accessibilityRole="button"
                onPress={retry}
                style={({ pressed }) => ({
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.accent }}>刷新完整收藏</Text>
              </Pressable>
            ) : null}
          </>
        }
        onRefresh={list.refresh}
        refreshing={list.refreshing}
        renderItem={renderItem}
      />
      <ScrollToTopButton onPress={list.scrollToTop} visible={list.visible} />
    </SafeAreaView>
  );
}
