import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
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

import { BLOG_FILTERS, type BlogFilter, type GlobalBlog } from '@/features/blogs/model';
import { useGlobalBlogs } from '@/features/blogs/use-global-blogs';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function GlobalBlogsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<BlogFilter>('all');
  const blogsQuery = useGlobalBlogs(filter);
  const blogs = useMemo(
    () => blogsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [blogsQuery.data],
  );
  const totalPages = blogsQuery.data?.pages[0]?.totalPages;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '日志' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={blogs}
        initialNumToRender={10}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          blogsQuery.isPending ? (
            <AppState text="正在读取 Bangumi 最新日志。" title="日志加载中" />
          ) : blogsQuery.isError ? (
            <AppState
              action={() => void blogsQuery.refetch()}
              text="Bangumi 偶尔会响应较慢，稍后重试即可。"
              title="日志读取失败"
            />
          ) : (
            <AppState text="这个分类暂时没有公开日志。" title="暂无日志" />
          )
        }
        ListFooterComponent={
          blogs.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(blogsQuery.hasNextPage)}
              isError={blogsQuery.isFetchNextPageError}
              isFetching={blogsQuery.isFetchingNextPage}
              loadedCount={blogs.length}
              onRetry={() => void blogsQuery.fetchNextPage()}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>日志</Text>
            <Text style={styles.meta}>
              来自 Bangumi 用户的最新长文
              {totalPages ? ` · ${totalPages} 页` : ''}
            </Text>
            <ScrollView
              contentContainerStyle={styles.filters}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {BLOG_FILTERS.map((item) => {
                const selected = item.id === filter;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.id}
                    onPress={() => setFilter(item.id)}
                    style={({ pressed }) => [
                      styles.filter,
                      selected && styles.filterSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {blogs.length > 0 && blogsQuery.isError ? (
              <CachedDataNotice onRetry={() => void blogsQuery.refetch()} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={10}
        onEndReached={() => {
          if (
            blogsQuery.hasNextPage &&
            !blogsQuery.isFetchingNextPage &&
            !blogsQuery.isFetchNextPageError
          ) {
            void blogsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void blogsQuery.refetch()}
            refreshing={blogsQuery.isRefetching && !blogsQuery.isPending}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <BlogRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === blogs.length - 1}
            item={item}
            onPress={() =>
              router.push({
                pathname: '/blog/[id]',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function BlogRow({
  hasDivider,
  isFirst,
  isLast,
  item,
  onPress,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: GlobalBlog;
  onPress: () => void;
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
        accessibilityLabel={`打开日志：${item.title}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          hasDivider && styles.rowDivider,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.cover}>
          <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
          {item.coverUrl ? (
            <Image
              contentFit="cover"
              recyclingKey={item.coverUrl}
              source={item.coverUrl}
              style={StyleSheet.absoluteFill}
              transition={120}
            />
          ) : null}
        </View>
        <View style={styles.rowMain}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text numberOfLines={2} style={styles.summary}>
            {item.summary || '暂无摘要'}
          </Text>
          <Text numberOfLines={1} style={styles.rowMeta}>
            {item.author} · {formatActivityTime(item.updatedAt)} · {item.replyCount} 回复
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
  filters: { gap: 8, paddingTop: 20 },
  filter: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: colors.surface },
  rowCard: { backgroundColor: colors.surface, paddingHorizontal: 16 },
  firstRowCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRowCard: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { flexDirection: 'row', minHeight: 144, paddingVertical: 16 },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    height: 108,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  coverFallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
  rowMain: { flex: 1, marginLeft: 14, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  summary: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  rowMeta: { color: colors.subtle, fontSize: 11, marginTop: 9 },
  pressed: { opacity: 0.62 },
});
