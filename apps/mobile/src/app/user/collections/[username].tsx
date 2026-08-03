import { useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
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

export default function PublicUserCollectionsScreen() {
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
  const collectionStatus = parseCollectionStatus(status);
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

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: collectionStatusLabel
            ? `${subjectTypeLabel} · ${collectionStatusLabel}`
            : `${subjectTypeLabel}收藏`,
        }}
      />
      <FlatList
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
              <Text style={styles.title}>{subjectTypeLabel}收藏</Text>
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
