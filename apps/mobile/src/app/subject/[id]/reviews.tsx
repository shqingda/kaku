import { memo, useCallback } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { useSubjectReviews } from '@/features/reviews/use-subject-reviews';
import type { SubjectReview } from '@/features/reviews/model';
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
          reviews.items.length === 0 ? (
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
              isError={reviewsQuery.isError && reviews.items.length === 0}
              isPending={reviewsQuery.isPending}
              loadingText="正在读取 Bangumi 评论…"
              onRetry={() => void reviewsQuery.refetch()}
            />
          </>
        }
        ListFooterComponent={
          reviews.items.length > 0 ? (
            <PagedListFooter {...reviews.footerProps} />
          ) : null
        }
        onRefresh={reviews.refresh}
        refreshing={reviews.refreshing}
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
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 14 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginTop: 12,
    padding: 18,
  },
  firstCard: { marginTop: 0 },
  pressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
  reviewTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: { color: colors.subtle, flex: 1, fontSize: 11 },
  replyCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  state: { alignItems: 'center', padding: 32 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
});
