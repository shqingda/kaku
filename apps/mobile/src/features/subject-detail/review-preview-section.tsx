import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { SubjectReview } from '@/features/reviews/model';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';

export function ReviewPreviewSection({
  isError,
  isPending,
  onOpenMore,
  onOpenReview,
  onRetry,
  reviews,
  total,
}: {
  isError: boolean;
  isPending: boolean;
  onOpenMore: () => void;
  onOpenReview: (review: SubjectReview) => void;
  onRetry: () => void;
  reviews: SubjectReview[];
  total?: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>评论</Text>
        <Text style={styles.meta}>
          {total !== undefined
            ? `最近 ${reviews.length} 篇评论`
            : isPending
              ? '读取中'
              : '暂时不可用'}
        </Text>
      </View>
      <DiscussionStatus
        errorText="评论加载失败，请检查网络后重试。"
        isError={isError}
        isPending={isPending}
        loadingText="正在读取 Bangumi 评论…"
        onRetry={onRetry}
      />
      {!isPending && !isError ? (
        <View style={styles.list}>
          {reviews.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Bangumi 还没有关于这个条目的评论。
              </Text>
            </View>
          ) : null}
          {reviews.map((review, index) => (
            <Pressable
              accessibilityLabel={`打开评论：${review.title}`}
              accessibilityRole="button"
              key={review.id}
              onPress={() => onOpenReview(review)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.main}>
                <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.reviewTitle}>
                  {review.title}
                </Text>
                <Text numberOfLines={1} style={styles.summary}>
                  {review.summary || '暂无摘要'}
                </Text>
                <Text style={styles.reviewMeta}>
                  {review.author} · {formatActivityTime(review.updatedAt)}
                </Text>
              </View>
              <View style={styles.replyCount}>
                <Text style={styles.replyCountText}>{review.replyCount}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityLabel="查看更多评论"
            accessibilityRole="button"
            onPress={onOpenMore}
            style={({ pressed }) => [
              styles.more,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.moreText}>
              {total ? `更多评论（${total}）` : '进入评论页'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: SPACING.lg, marginTop: SPACING.xs },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  title: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  meta: { color: colors.subtle, ...TYPE.caption },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  row: { alignItems: 'center', flexDirection: 'row', paddingVertical: SPACING.lg },
  rowBorder: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, paddingRight: SPACING.lg },
  reviewTitle: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '700',
  },
  summary: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  reviewMeta: { color: colors.subtle, ...TYPE.caption, marginTop: SPACING.sm },
  replyCount: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 32,
    paddingHorizontal: SPACING.sm,
  },
  replyCountText: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  empty: { alignItems: 'center', padding: SPACING.xxl },
  emptyText: { color: colors.muted, ...TYPE.body, lineHeight: 21 },
  more: {
    alignItems: 'center',
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  moreText: { color: colors.accent, ...TYPE.body, fontWeight: '700' },
  chevron: { color: colors.subtle, ...TYPE.titleLarge, fontWeight: '300' },
  pressed: { opacity: 0.62 },
});
