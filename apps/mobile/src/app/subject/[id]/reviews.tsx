import { SPACING, TYPE } from '@/constants/design';
import { memo, useCallback } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { useSubjectReviews } from '@/features/reviews/use-subject-reviews';
import type { SubjectReview } from '@/features/reviews/model';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

const ReviewRow = memo(function ReviewRow({
  isFirst,
  item,
  onPressItem,
  styles,
}: {
  isFirst: boolean;
  item: SubjectReview;
  onPressItem: (review: SubjectReview) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityLabel={`打开评论：${item.title}`}
      accessibilityRole="button"
      onPress={() => onPressItem(item)}
      style={({ pressed }) => [
        styles.card,
        isFirst && styles.firstCard,
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
  );
});

export default function SubjectReviewsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const reviewsQuery = useSubjectReviews(subjectId ?? 0);
  const reviews = usePagedList(reviewsQuery);
  const total = reviews.total ?? 0;
  const openReview = useCallback(
    (review: SubjectReview) => {
      router.push({
        pathname: '/subject/[id]/review/[reviewId]',
        params: { id: String(subjectId), reviewId: review.id },
      });
    },
    [subjectId],
  );
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: SubjectReview }) => (
      <ReviewRow
        isFirst={index === 0}
        item={item}
        onPressItem={openReview}
        styles={styles}
      />
    ),
    [openReview, styles],
  );

  if (!subjectId) {
    return <InvalidRouteState message="这个评论列表链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '评论' }} />
      <FlatList
        {...reviews.listProps}
        contentContainerStyle={styles.content}
        data={reviews.items}
        keyExtractor={(review) => review.id}
        ListEmptyComponent={
          !reviewsQuery.isPending &&
          !reviewsQuery.isError &&
          !reviewsQuery.isPaused &&
          reviews.items.length === 0 ? (
            <EmptyState />
          ) : undefined
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
            {reviews.items.length > 0 && (reviewsQuery.isError || reviewsQuery.isPaused) ? (
              <CachedDataNotice onRetry={() => void reviewsQuery.refetch()} retrying={reviewsQuery.isRefetching} />
            ) : (
              <DiscussionStatus
                errorText={reviewsQuery.isPaused
                  ? '网络暂不可用，恢复连接后可重试评论。'
                  : '评论加载失败，请检查网络后重试。'}
                isError={reviewsQuery.isError || reviewsQuery.isPaused}
                isPending={reviewsQuery.isPending}
                loadingText="正在读取 Bangumi 评论…"
                onRetry={() => void reviewsQuery.refetch()}
                retryLabel="重试加载评论"
              />
            )}
          </>
        }
        ListFooterComponent={
          reviews.items.length > 0 ? (
            <PagedListFooter {...reviews.footerProps} />
          ) : undefined
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={reviews.refresh}
            refreshing={reviews.refreshing}
          />
        }
        renderItem={renderItem}
      />
      <ScrollToTopButton
        onPress={reviews.scrollToTop}
        visible={reviews.visible}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>暂无评论</Text>
      <Text style={styles.stateText}>Bangumi 还没有收录相关评论。</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xxl + SPACING.md, paddingHorizontal: SPACING.xl },
  header: { paddingBottom: SPACING.lg, paddingTop: SPACING.lg },
  title: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
  },
  meta: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  firstCard: { marginTop: SPACING.none },
  pressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
  reviewTitle: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '800',
  },
  body: { color: colors.muted, ...TYPE.body, marginTop: SPACING.md },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  footerText: { color: colors.subtle, flex: 1, ...TYPE.micro },
  replyCount: { color: colors.muted, ...TYPE.micro, fontWeight: '700' },
  state: { alignItems: 'center', padding: SPACING.xxl },
  stateTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  stateText: {
    color: colors.muted,
    ...TYPE.body,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
