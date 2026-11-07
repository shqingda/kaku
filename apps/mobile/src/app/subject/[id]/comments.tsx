import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { memo, useCallback } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useSubjectComments } from '@/features/reviews/use-subject-reviews';
import type { SubjectComment } from '@/features/reviews/model';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { withoutBlockedAuthors } from '@/features/users/blocked-content';
import { useBlockedUserIds } from '@/features/users/use-blocklist';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

const CommentRow = memo(function CommentRow({
  isFirst,
  item,
  styles,
}: {
  isFirst: boolean;
  item: SubjectComment;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.card, isFirst && styles.firstCard]}>
      <View style={styles.commentHeader}>
        {item.authorUsername ? (
          <Link
            asChild
            href={{
              pathname: '/user/[username]',
              params: { username: item.authorUsername },
            }}
          >
            <Pressable
              accessibilityLabel={`打开${item.author}的公开主页`}
              accessibilityRole="button"
              style={({ pressed }) => [styles.authorButton, pressed && styles.pressed]}
            >
              <Text style={styles.author}>{item.author}</Text>
            </Pressable>
          </Link>
        ) : (
          <Text style={styles.author}>{item.author}</Text>
        )}
        {item.rating ? <RatingStars rating={item.rating} /> : null}
      </View>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.footer}>
        {formatActivityTime(item.updatedAt)}
      </Text>
    </View>
  );
});

export default function SubjectCommentsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const commentsQuery = useSubjectComments(subjectId ?? 0);
  const blockedIds = useBlockedUserIds();
  const comments = usePagedList(commentsQuery, (items) => withoutBlockedAuthors(items, blockedIds));
  const total = comments.total ?? 0;
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: SubjectComment }) => (
      <CommentRow isFirst={index === 0} item={item} styles={styles} />
    ),
    [styles],
  );

  if (!subjectId) {
    return <InvalidRouteState message="这个吐槽箱链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '吐槽箱' }} />
      <FlatList
        {...comments.listProps}
        contentContainerStyle={styles.content}
        data={comments.items}
        keyExtractor={(comment) => comment.id}
        ListEmptyComponent={
          !commentsQuery.isPending &&
          !commentsQuery.isError &&
          !commentsQuery.isPaused &&
          comments.items.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>暂无吐槽</Text>
              <Text style={styles.stateText}>Bangumi 还没有收录相关吐槽。</Text>
            </View>
          ) : undefined
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>吐槽箱</Text>
              <Text style={styles.meta}>
                {total
                  ? `共 ${total} 条 · 无需登录即可浏览`
                  : '无需登录即可浏览'}
              </Text>
            </View>
            {comments.items.length > 0 && (commentsQuery.isError || commentsQuery.isPaused) ? (
              <CachedDataNotice onRetry={() => void commentsQuery.refetch()} retrying={commentsQuery.isRefetching} />
            ) : (
              <DiscussionStatus
                errorText={commentsQuery.isPaused
                  ? '网络暂不可用，恢复连接后可重试吐槽。'
                  : '吐槽加载失败，请检查网络后重试。'}
                isError={commentsQuery.isError || commentsQuery.isPaused}
                isPending={commentsQuery.isPending}
                loadingText="正在读取 Bangumi 吐槽…"
                onRetry={() => void commentsQuery.refetch()}
                retryLabel="重试加载吐槽"
              />
            )}
          </>
        }
        ListFooterComponent={
          comments.items.length > 0 ? (
            <PagedListFooter {...comments.footerProps} />
          ) : undefined
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={comments.refresh}
            refreshing={comments.refreshing}
          />
        }
        renderItem={renderItem}
      />
      <ScrollToTopButton
        onPress={comments.scrollToTop}
        visible={comments.visible}
      />
    </SafeAreaView>
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
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  authorButton: { justifyContent: 'center', minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE, paddingVertical: SPACING.xs },
  author: { color: colors.ink, ...TYPE.body, fontWeight: '800' },
  body: { color: colors.muted, ...TYPE.body, marginTop: SPACING.md },
  footer: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.md },
  pressed: { opacity: 0.6 },
  state: { alignItems: 'center', padding: SPACING.xxl },
  stateTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  stateText: {
    color: colors.muted,
    ...TYPE.body,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
