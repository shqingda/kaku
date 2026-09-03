import { memo, useCallback, useMemo } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useSubjectComments } from '@/features/reviews/use-subject-reviews';
import type { SubjectComment } from '@/features/reviews/model';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
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
              style={({ pressed }) => pressed && styles.pressed}
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const commentsQuery = useSubjectComments(subjectId ?? 0);
  const comments = usePagedList(commentsQuery);
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
          comments.items.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>暂无吐槽</Text>
              <Text style={styles.stateText}>Bangumi 还没有收录相关吐槽。</Text>
            </View>
          ) : null
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
            <DiscussionStatus
              errorText="吐槽加载失败，请检查网络后重试。"
              isError={commentsQuery.isError && comments.items.length === 0}
              isPending={commentsQuery.isPending}
              loadingText="正在读取 Bangumi 吐槽…"
              onRetry={() => void commentsQuery.refetch()}
            />
          </>
        }
        ListFooterComponent={
          comments.items.length > 0 ? (
            <PagedListFooter {...comments.footerProps} />
          ) : null
        }
        onRefresh={comments.refresh}
        refreshing={comments.refreshing}
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
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  footer: { color: colors.subtle, fontSize: 11, marginTop: 12 },
  pressed: { opacity: 0.6 },
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
