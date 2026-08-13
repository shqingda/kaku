import { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { useSubjectIndexes } from '@/features/indexes/use-indexes';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectIndexesScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const indexesQuery = useSubjectIndexes(subjectId ?? 0);
  const indexes = useMemo(
    () => indexesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [indexesQuery.data],
  );
  const total = indexesQuery.data?.pages[0]?.total ?? 0;

  if (!subjectId) {
    return <InvalidRouteState message="这个条目目录链接缺少有效编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '目录' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={indexes}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !indexesQuery.isPending && !indexesQuery.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>暂无相关目录</Text>
              <Text style={styles.emptyText}>该条目还没有被收录进公开目录。</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>相关目录</Text>
              <Text style={styles.meta}>
                {indexesQuery.data
                  ? `已加载 ${indexes.length} · 共 ${total.toLocaleString('zh-CN')}`
                  : '公开内容'}
              </Text>
            </View>
            <DiscussionStatus
              errorText="目录加载失败，请检查网络后重试。"
              isError={indexesQuery.isError}
              isPending={indexesQuery.isPending}
              loadingText="正在读取相关目录…"
              onRetry={() => void indexesQuery.refetch()}
            />
          </>
        }
        ListFooterComponent={
          indexes.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(indexesQuery.hasNextPage)}
              isError={indexesQuery.isFetchNextPageError}
              isFetching={indexesQuery.isFetchingNextPage}
              loadedCount={indexes.length}
              onRetry={() => void indexesQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
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
        onRefresh={() => void indexesQuery.refetch()}
        refreshing={indexesQuery.isRefetching && !indexesQuery.isPending}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/directory/[id]',
                params: { id: String(item.id) },
              })
            }
            style={({ pressed }) => [
              styles.card,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.indexTitle}>{item.title}</Text>
            <Text style={styles.indexMeta}>
              {item.author} · {item.itemCount} 项 ·{' '}
              {formatActivityTime(item.updatedAt)}
            </Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  header: { paddingBottom: 10, paddingTop: 2 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
  },
  indexTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  indexMeta: { color: colors.subtle, fontSize: 12, marginTop: 9 },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },
});
