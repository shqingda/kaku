import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
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
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from '@/features/collections/use-personal-collection';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicUserCollection } from '@/features/users/model';
import { usePublicUserCollections } from '@/features/users/use-public-user';
import type { WatchingItem } from '@/features/watching/model';
import type { CollectionStatus } from '@/features/watching/model';

const COLLECTION_STATUSES = new Set<CollectionStatus>([
  'completed',
  'doing',
  'dropped',
  'onHold',
  'wish',
]);

const COLLECTION_STATUS_OPTIONS: Array<CollectionStatus | undefined> = [
  undefined,
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
];

function parseCollectionStatus(value?: string) {
  return value && COLLECTION_STATUSES.has(value as CollectionStatus)
    ? (value as CollectionStatus)
    : undefined;
}

const CollectionRow = memo(function CollectionRow({
  canEdit,
  isFirst,
  isLast,
  item,
  onPressItem,
}: {
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicUserCollection;
  onPressItem: (id: number) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.item,
        isFirst && styles.firstItem,
        isLast && styles.lastItem,
      ]}
    >
      <PublicUserCollectionRow
        hasDivider={!isFirst}
        item={item}
        onPress={() => onPressItem(item.id)}
        trailing={canEdit ? <CollectionRowEditor item={item} /> : undefined}
      />
    </View>
  );
});

export default function PublicUserCollectionsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { status, type, username } = useLocalSearchParams<{
    status?: string;
    type?: string;
    username: string;
  }>();
  const { session } = useAuth();
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
  const isTrackingPage = collectionStatus === 'doing';
  const canEdit = isTrackingPage && session?.user.username === username;
  const openSubject = useCallback((id: number) => {
    router.push({
      pathname: '/subject/[id]',
      params: { id: String(id) },
    });
  }, []);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: PublicUserCollection }) => (
      <CollectionRow
        canEdit={canEdit}
        isFirst={index === 0}
        isLast={index === collections.items.length - 1}
        item={item}
        onPressItem={openSubject}
      />
    ),
    [canEdit, collections.items.length, openSubject],
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

function CollectionStatusTabs({
  onChange,
  selectedStatus,
  subjectType,
}: {
  onChange: (status: CollectionStatus | undefined) => void;
  selectedStatus?: CollectionStatus;
  subjectType: number;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      contentContainerStyle={styles.statusTabs}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {COLLECTION_STATUS_OPTIONS.map((status) => {
        const selected = status === selectedStatus;
        const label = status
          ? getCollectionStatusLabel(subjectType, status)
          : '全部';

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={status ?? 'all'}
            onPress={() => onChange(status)}
            style={({ pressed }) => [
              styles.statusTab,
              selected && styles.statusTabSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.statusTabText,
                selected && styles.statusTabTextSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CollectionRowEditor({ item }: { item: PublicUserCollection }) {
  const { session } = useAuth();
  const saveCollection = useSavePersonalCollection(item.id);
  // 公开行没有吐槽/标签/可见范围，编辑时以个人收藏为准补齐，
  // 让抽屉与条目详情页的编辑面板保持同一套字段。
  const personalQuery = usePersonalCollection(item.id);
  const personal = personalQuery.data;
  const watchingItem: WatchingItem = {
    collectionStatus: personal?.collectionStatus ?? item.collectionStatus,
    comment: session ? personal?.comment ?? '' : undefined,
    coverUrl: item.coverUrl ?? '',
    episodeAirDates: [],
    id: item.id,
    isPrivate: session ? personal?.isPrivate ?? false : undefined,
    rating: personal?.rating ?? item.rate,
    readChapterCount:
      item.subjectType === 1
        ? personal?.readChapterCount ?? item.progress
        : undefined,
    readVolumeCount:
      item.subjectType === 1
        ? personal?.readVolumeCount ?? item.volumeProgress
        : undefined,
    summary: '',
    tags: session ? personal?.tags ?? [] : undefined,
    title: item.title,
    totalEpisodes: item.totalEpisodes,
    type: item.subjectType,
    watchedEpisodeNumbers:
      personal?.watchedEpisodeNumbers ??
      Array.from({ length: item.progress }, (_, index) => index + 1),
    year: 0,
  };

  return (
    <CollectionControls
      item={watchingItem}
      onSave={(update) =>
        saveCollection.mutateAsync(update).then(() => undefined)
      }
      variant="compact"
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 4,
    paddingTop: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 7,
  },
  subjectTypeTabs: { paddingBottom: 14 },
  statusTabs: { gap: 8, paddingBottom: 18, paddingRight: 20 },
  statusTab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 58,
    paddingHorizontal: 14,
  },
  statusTabSelected: { backgroundColor: colors.ink },
  statusTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  statusTabTextSelected: { color: colors.surface },
  item: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  firstItem: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastItem: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  pressed: { opacity: 0.62 },
});
