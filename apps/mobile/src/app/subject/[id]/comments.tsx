import { useMemo } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useSubjectComments } from '@/features/reviews/use-subject-reviews';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToBottomButton } from '@/features/shared/scroll-to-bottom-button';
import { TappableHeaderTitle } from '@/features/shared/tappable-header-title';
import { useScrollToBottomButton } from '@/features/shared/use-scroll-to-bottom-button';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectCommentsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const commentsQuery = useSubjectComments(subjectId ?? 0);
  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [commentsQuery.data],
  );
  const total = commentsQuery.data?.pages[0]?.total ?? 0;
  const scrollToBottom = useScrollToBottomButton(undefined, {
    getLastIndex: () => comments.length - 1,
    // 跳到底部时若还有未加载的吐槽，顺势触发下一页；页脚会显示加载
    // 状态，加载完成后不自动滚动，由用户继续上滑或再次点按。
    onLoadMore:
      commentsQuery.hasNextPage &&
      !commentsQuery.isFetchingNextPage &&
      !commentsQuery.isFetchNextPageError
        ? () => void commentsQuery.fetchNextPage()
        : undefined,
  });

  function scrollToTop() {
    scrollToBottom.ref.current?.scrollToOffset({
      animated: true,
      offset: 0,
    });
  }

  if (!subjectId) {
    return <InvalidRouteState message="这个吐槽箱链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TappableHeaderTitle onPress={scrollToTop} title="吐槽箱" />
          ),
        }}
      />
      <FlatList
        ref={scrollToBottom.ref}
        contentContainerStyle={styles.content}
        data={comments}
        keyExtractor={(comment) => comment.id}
        ListEmptyComponent={
          !commentsQuery.isPending &&
          !commentsQuery.isError &&
          comments.length === 0 ? (
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
              isError={commentsQuery.isError && comments.length === 0}
              isPending={commentsQuery.isPending}
              loadingText="正在读取 Bangumi 吐槽…"
              onRetry={() => void commentsQuery.refetch()}
            />
          </>
        }
        ListFooterComponent={
          comments.length > 0 ? (
            <PagedListFooter
              hasNextPage={commentsQuery.hasNextPage}
              isError={commentsQuery.isFetchNextPageError}
              isFetching={commentsQuery.isFetchingNextPage}
              loadedCount={comments.length}
              onRetry={() => void commentsQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
        onEndReached={() => {
          if (
            commentsQuery.hasNextPage &&
            !commentsQuery.isFetchingNextPage &&
            !commentsQuery.isFetchNextPageError
          ) {
            void commentsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() => void commentsQuery.refetch()}
        onContentSizeChange={scrollToBottom.handleContentSizeChange}
        onLayout={scrollToBottom.handleLayout}
        onScroll={scrollToBottom.handleScroll}
        onScrollToIndexFailed={scrollToBottom.handleScrollToIndexFailed}
        refreshing={commentsQuery.isRefetching && !commentsQuery.isPending}
        renderItem={({ index, item }) => (
          <View style={[styles.card, index === 0 && styles.firstCard]}>
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
        )}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={80}
      />
      <ScrollToBottomButton
        onPress={scrollToBottom.scrollToBottom}
        visible={scrollToBottom.visible}
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
