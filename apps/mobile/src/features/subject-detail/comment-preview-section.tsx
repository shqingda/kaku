import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { SubjectComment } from '@/features/reviews/model';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';

export function CommentPreviewSection({
  comments,
  isError,
  isPending,
  onOpenMore,
  onRetry,
  total,
}: {
  comments: SubjectComment[];
  isError: boolean;
  isPending: boolean;
  onOpenMore: () => void;
  onRetry: () => void;
  total?: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>吐槽箱</Text>
        <Text style={styles.meta}>
          {total !== undefined
            ? `${total} 条吐槽`
            : isPending
              ? '读取中'
              : '暂时不可用'}
        </Text>
      </View>
      <DiscussionStatus
        errorText="吐槽箱加载失败，请检查网络后重试。"
        isError={isError}
        isPending={isPending}
        loadingText="正在读取 Bangumi 吐槽箱…"
        onRetry={onRetry}
      />
      {!isPending && !isError ? (
        <View style={styles.list}>
          {comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Bangumi 还没有关于这个条目的吐槽。
              </Text>
            </View>
          ) : null}
          {comments.map((comment, index) => (
            <View
              key={comment.id}
              style={[styles.row, index > 0 && styles.rowBorder]}
            >
              <View style={styles.commentHeader}>
                {comment.authorUsername ? (
                  <Link
                    asChild
                    href={{
                      pathname: '/user/[username]',
                      params: { username: comment.authorUsername },
                    }}
                  >
                    <Pressable
                      accessibilityLabel={`打开${comment.author}的主页`}
                      accessibilityRole="link"
                      style={({ pressed }) => [
                        styles.authorButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.author}>
                        {comment.author}
                      </Text>
                    </Pressable>
                  </Link>
                ) : (
                  <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.author}>
                    {comment.author}
                  </Text>
                )}
                {comment.rating ? (
                  <RatingStars rating={comment.rating} />
                ) : null}
              </View>
              <Text numberOfLines={3} style={styles.body}>
                {comment.body}
              </Text>
              <Text style={styles.date}>
                {formatActivityTime(comment.updatedAt)}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityLabel="查看更多吐槽"
            accessibilityRole="button"
            onPress={onOpenMore}
            style={({ pressed }) => [
              styles.more,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.moreText}>
              {total ? `更多吐槽（${total}）` : '进入吐槽箱'}
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
  row: { paddingVertical: SPACING.lg },
  rowBorder: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    color: colors.ink,
    ...TYPE.body,
    fontWeight: '800',
    marginRight: SPACING.md,
  },
  authorButton: { flex: 1 },
  body: { color: colors.muted, ...TYPE.body, marginTop: SPACING.sm },
  date: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.sm },
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
  chevron: { color: colors.subtle, ...TYPE.display, fontWeight: '300' },
  pressed: { opacity: 0.62 },
});
