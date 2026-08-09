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

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useSavePersonalCollection } from '@/features/collections/use-personal-collection';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
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
  const { status, type, username } = useLocalSearchParams<{
    status?: string;
    type?: string;
    username: string;
  }>();
  const { session } = useAuth();
  const listRef = useRef<FlatList<PublicUserCollection>>(null);
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
            <CollectionState
              text={`正在读取公开${subjectTypeLabel}收藏。`}
              title="收藏加载中"
            />
          ) : collectionsQuery.isError ? (
            <CollectionState
              action={() => void collectionsQuery.refetch()}
              text="请检查网络后重试，已加载的数据不会被覆盖。"
              title="收藏读取失败"
            />
          ) : (
            <CollectionState
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
        updateCellsBatchingPeriod={40}
        windowSize={7}
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

function CollectionState({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
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
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
  },
  subjectTypeTabs: { paddingBottom: 14 },
  statusTabs: { gap: 8, paddingBottom: 18, paddingRight: 20 },
  statusTab: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderCurve: 'continuous',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 58,
    paddingHorizontal: 14,
  },
  statusTabSelected: { backgroundColor: COLORS.ink },
  statusTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  statusTabTextSelected: { color: COLORS.surface },
  item: {
    backgroundColor: COLORS.surface,
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
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 30,
  },
  stateTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: { opacity: 0.62 },
});
