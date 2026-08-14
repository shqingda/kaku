import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { IndexComposer } from '@/features/indexes/index-composer';
import {
  INDEX_SORTS,
  type IndexSort,
  type PublicIndexSummary,
} from '@/features/indexes/model';
import { useGlobalIndexes } from '@/features/indexes/use-global-indexes';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function DirectoriesScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sort, setSort] = useState<IndexSort>('latest');
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const indexesQuery = useGlobalIndexes(sort);
  const indexes = useMemo(
    () => indexesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [indexesQuery.data],
  );
  const totalPages = indexesQuery.data?.pages[0]?.totalPages;

  function openComposer() {
    if (session) {
      setComposerVisible(true);
      return;
    }

    Alert.alert(
      '登录后新建目录',
      '目录会保存在你的 Bangumi 账户。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: () => router.push('/account'), text: '去登录' },
      ],
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '目录发现' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={indexes}
        initialNumToRender={10}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          indexesQuery.isPending ? (
            <AppState text="正在读取 Bangumi 公开目录。" title="目录加载中" />
          ) : indexesQuery.isError ? (
            <AppState
              action={() => void indexesQuery.refetch()}
              text="Bangumi 偶尔会响应较慢，稍后重试即可。"
              title="目录读取失败"
            />
          ) : (
            <AppState text="这里暂时没有公开目录。" title="暂无目录" />
          )
        }
        ListFooterComponent={
          indexes.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(indexesQuery.hasNextPage)}
              isError={indexesQuery.isFetchNextPageError}
              isFetching={indexesQuery.isFetchingNextPage}
              loadedCount={indexes.length}
              onRetry={() => void indexesQuery.fetchNextPage()}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>目录发现</Text>
            <Text style={styles.meta}>
              用户围绕主题整理的条目清单
              {totalPages ? ` · ${totalPages} 页` : ''}
            </Text>
            <View style={styles.filters}>
              {INDEX_SORTS.map((item) => {
                const selected = item.id === sort;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.id}
                    onPress={() => setSort(item.id)}
                    style={[styles.filter, selected && styles.filterSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityLabel="新建目录"
              accessibilityRole="button"
              onPress={openComposer}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  android: 'add',
                  ios: 'plus',
                  web: 'add',
                }}
                size={15}
                tintColor={colors.surface}
                weight="semibold"
              />
              <Text style={styles.createButtonText}>新建目录</Text>
            </Pressable>
            {indexes.length > 0 && indexesQuery.isError ? (
              <CachedDataNotice onRetry={() => void indexesQuery.refetch()} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={10}
        onEndReached={() => {
          if (
            indexesQuery.hasNextPage &&
            !indexesQuery.isFetchingNextPage &&
            !indexesQuery.isFetchNextPageError
          ) {
            void indexesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void indexesQuery.refetch()}
            refreshing={indexesQuery.isRefetching && !indexesQuery.isPending}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <IndexRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === indexes.length - 1}
            item={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
      <IndexComposer
        onClose={() => setComposerVisible(false)}
        onCreated={(indexId) => {
          setComposerVisible(false);
          router.push({
            pathname: '/directory/[id]',
            params: { id: String(indexId) },
          });
        }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

function IndexRow({
  hasDivider,
  isFirst,
  isLast,
  item,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicIndexSummary;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.rowCard,
        isFirst && styles.firstRowCard,
        isLast && styles.lastRowCard,
      ]}
    >
      <Pressable
        accessibilityLabel={`打开目录：${item.title}`}
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/directory/[id]',
            params: { id: String(item.id) },
          })
        }
        style={({ pressed }) => [
          styles.row,
          hasDivider && styles.rowDivider,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarFallback}>{item.author.slice(0, 1)}</Text>
          {item.authorAvatarUrl ? (
            <Image
              contentFit="cover"
              recyclingKey={item.authorAvatarUrl}
              source={item.authorAvatarUrl}
              style={StyleSheet.absoluteFill}
              transition={120}
            />
          ) : null}
        </View>
        <View style={styles.rowMain}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{item.itemCount} 项</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={styles.description}>
            {item.description || '暂无简介'}
          </Text>
          <Text numberOfLines={1} style={styles.rowMeta}>
            {item.author} · {formatActivityTime(item.updatedAt)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  filters: { flexDirection: 'row', gap: 8, paddingTop: 20 },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: colors.surface },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 46,
  },
  createButtonText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  rowCard: { backgroundColor: colors.surface, paddingHorizontal: 16 },
  firstRowCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRowCard: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { flexDirection: 'row', minHeight: 130, paddingVertical: 17 },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  avatarFallback: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  rowMain: { flex: 1, marginLeft: 14, minWidth: 0 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  rowTitle: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  countPill: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  countText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  rowMeta: { color: colors.subtle, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.62 },
});
