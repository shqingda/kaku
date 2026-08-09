import { useMemo } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useSubjectComments } from '@/features/reviews/use-subject-reviews';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function SubjectCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commentsQuery = useSubjectComments(Number(id));
  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [commentsQuery.data],
  );
  const total = commentsQuery.data?.pages[0]?.total ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '吐槽箱' }} />
      <FlatList
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
      />
    </SafeAreaView>
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
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  body: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  footer: { color: COLORS.subtle, fontSize: 11, marginTop: 12 },
  pressed: { opacity: 0.6 },
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
