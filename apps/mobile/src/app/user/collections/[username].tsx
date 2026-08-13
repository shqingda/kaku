import { useMemo, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Platform,
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
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useSavePersonalCollection } from '@/features/collections/use-personal-collection';
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

export default function PublicUserCollectionsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { status, type, username } = useLocalSearchParams<{
    status?: string;
    type?: string;
    username: string;
  }>();
  const { session } = useAuth();
  const listRef = useRef<FlatList<PublicUserCollection>>(null);
  const [showsScrollToTop, setShowsScrollToTop] = useState(false);
  const initialType = Number(type);
  const [subjectType, setSubjectType] = useState(() =>
    SUBJECT_TYPES.some((item) => item.id === initialType) ? initialType : 2,
  );
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);
  const [collectionStatus, setCollectionStatus] = useState(() =>
    parseCollectionStatus(status),
  );
  const collectionStatusLabel = collectionStatus
    ? getCollectionStatusLabel(subjectType, collectionStatus)
    : undefined;
  const collectionsQuery = usePublicUserCollections(
    username,
    subjectType,
    collectionStatus,
  );
  const collections = useMemo(
    () =>
      collectionsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [collectionsQuery.data],
  );
  const total = collectionsQuery.data?.pages[0]?.total ?? 0;
  const isTrackingPage = collectionStatus === 'doing';
  const canEdit = isTrackingPage && session?.user.username === username;

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
        ref={listRef}
        contentContainerStyle={styles.content}
        data={collections}
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
          collections.length > 0 ? (
            <PagedListFooter
              hasNextPage={collectionsQuery.hasNextPage}
              isError={collectionsQuery.isFetchNextPageError}
              isFetching={collectionsQuery.isFetchingNextPage}
              loadedCount={collections.length}
              onRetry={() => void collectionsQuery.fetchNextPage()}
              total={total}
            />
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
                listRef.current?.scrollToOffset({ animated: false, offset: 0 });
              }}
              selectedStatus={collectionStatus}
              subjectType={subjectType}
            />
          </>
        }
        maxToRenderPerBatch={12}
        onEndReached={() => {
          if (
            collectionsQuery.hasNextPage &&
            !collectionsQuery.isFetchingNextPage &&
            !collectionsQuery.isFetchNextPageError
          ) {
            void collectionsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() => void collectionsQuery.refetch()}
        onScroll={(event) => {
          const shouldShow = event.nativeEvent.contentOffset.y > 720;
          setShowsScrollToTop((current) =>
            current === shouldShow ? current : shouldShow,
          );
        }}
        refreshing={
          collectionsQuery.isRefetching && !collectionsQuery.isPending
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.firstItem,
              index === collections.length - 1 && styles.lastItem,
            ]}
          >
            <PublicUserCollectionRow
              hasDivider={index > 0}
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]',
                  params: { id: String(item.id) },
                })
              }
              trailing={
                canEdit ? <CollectionRowEditor item={item} /> : undefined
              }
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={80}
        updateCellsBatchingPeriod={40}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={() => listRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        visible={showsScrollToTop}
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
  const saveCollection = useSavePersonalCollection(item.id);
  const watchingItem: WatchingItem = {
    collectionStatus: item.collectionStatus,
    coverUrl: item.coverUrl ?? '',
    episodeAirDates: [],
    id: item.id,
    rating: item.rate,
    readChapterCount: item.subjectType === 1 ? item.progress : undefined,
    readVolumeCount:
      item.subjectType === 1 ? item.volumeProgress : undefined,
    summary: '',
    title: item.title,
    totalEpisodes: item.totalEpisodes,
    type: item.subjectType,
    watchedEpisodeNumbers: Array.from(
      { length: item.progress },
      (_, index) => index + 1,
    ),
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
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 44,
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
