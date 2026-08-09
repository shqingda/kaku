import { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { useSubjectReviews } from '@/features/reviews/use-subject-reviews';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { formatActivityTime } from '@/lib/format-activity-time';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const reviewsQuery = useSubjectReviews(subjectId ?? 0);
  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [reviewsQuery.data],
  );
  const total = reviewsQuery.data?.pages[0]?.total ?? 0;

  if (!subjectId) {
    return <InvalidRouteState message="这个评论列表链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '评论' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={reviews}
        keyExtractor={(review) => review.id}
        ListEmptyComponent={
          !reviewsQuery.isPending &&
          !reviewsQuery.isError &&
          reviews.length === 0 ? (
            <EmptyState />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>评论</Text>
              <Text style={styles.meta}>
                {total
                  ? `共 ${total} 篇 · 无需登录即可浏览`
                  : '无需登录即可浏览'}
              </Text>
            </View>
            <DiscussionStatus
              errorText="评论加载失败，请检查网络后重试。"
              isError={reviewsQuery.isError && reviews.length === 0}
              isPending={reviewsQuery.isPending}
              loadingText="正在读取 Bangumi 评论…"
              onRetry={() => void reviewsQuery.refetch()}
            />
          </>
        }
        ListFooterComponent={
          reviews.length > 0 ? (
            <PagedListFooter
              hasNextPage={reviewsQuery.hasNextPage}
              isError={reviewsQuery.isFetchNextPageError}
              isFetching={reviewsQuery.isFetchingNextPage}
              loadedCount={reviews.length}
              onRetry={() => void reviewsQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
        onEndReached={() => {
          if (
            reviewsQuery.hasNextPage &&
            !reviewsQuery.isFetchingNextPage &&
            !reviewsQuery.isFetchNextPageError
          ) {
            void reviewsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() => void reviewsQuery.refetch()}
        refreshing={reviewsQuery.isRefetching && !reviewsQuery.isPending}
        renderItem={({ index, item }) => (
          <Pressable
            accessibilityLabel={`打开评论：${item.title}`}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/subject/[id]/review/[reviewId]',
                params: { id: String(subjectId), reviewId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.card,
              index === 0 && styles.firstCard,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.reviewTitle}>{item.title}</Text>
            <Text numberOfLines={5} style={styles.body}>
              {item.summary || '暂无摘要'}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {item.author} · {formatActivityTime(item.updatedAt)}
              </Text>
              <Text style={styles.replyCount}>{item.replyCount} 回复</Text>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>暂无评论</Text>
      <Text style={styles.stateText}>Bangumi 还没有收录相关评论。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 14 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginTop: 12,
    padding: 18,
  },
  firstCard: { marginTop: 0 },
  pressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
  reviewTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  body: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: { color: COLORS.subtle, flex: 1, fontSize: 11 },
  replyCount: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  state: { alignItems: 'center', padding: 32 },
  stateTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
});
