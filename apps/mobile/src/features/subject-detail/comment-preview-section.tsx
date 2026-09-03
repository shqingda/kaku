import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  section: { marginBottom: 14, marginTop: 4 },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.subtle, fontSize: 12 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  row: { paddingVertical: 16 },
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
    fontSize: 14,
    fontWeight: '800',
    marginRight: 12,
  },
  authorButton: { flex: 1 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  date: { color: colors.subtle, fontSize: 11, marginTop: 9 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  more: {
    alignItems: 'center',
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  moreText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  chevron: { color: colors.subtle, fontSize: 25, fontWeight: '300' },
  pressed: { opacity: 0.62 },
});
