import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useRef } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { EmptyDiscussionReplies } from '@/features/discussions/empty-discussion-replies';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { useSubjectReview } from '@/features/reviews/use-subject-reviews';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { HeaderShareButton } from '@/features/shared/header-share-button';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { BangumiText } from '@/features/shared/bangumi-text';
import { formatActivityTime } from '@/lib/format-activity-time';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectReviewScreen() {
  return <ReviewDiscussionScreen kind="review" />;
}

export function ReviewDiscussionScreen({ kind }: { kind: 'blog' | 'review' }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id, reviewId, replyId } = useLocalSearchParams<{
    id?: string;
    reviewId?: string;
    replyId?: string;
  }>();
  const numericReviewId = parsePositiveIntegerRouteParam(reviewId ?? id);
  const numericReplyId = parsePositiveIntegerRouteParam(replyId);
  const { isSigningIn, session } = useAuth();
  const composer = useReplyComposer();
  const reviewQuery = useSubjectReview(numericReviewId ?? 0);
  const { remove: deleteReply } = useDiscussionReply({
    id: numericReviewId ?? 0,
    kind: 'review',
  });
  const review = reviewQuery.data;
  const replies = review?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const scrollToTop = useScrollToTopButton(replyNavigation.listRef);
  const appliedReplyRef = useRef(false);
  const contentLabel = kind === 'blog' ? '日志' : '评论';

  useEffect(() => {
    if (appliedReplyRef.current) {
      return;
    }

    if (!numericReplyId || replies.length === 0) {
      return;
    }

    appliedReplyRef.current = true;
    replyNavigation.openReply(String(numericReplyId));
  }, [numericReplyId, replies.length, replyNavigation]);

  function confirmDeleteReply(reply: DiscussionReply) {
    Alert.alert(
      '删除这条回复？',
      '删除后无法恢复。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => {
            const postId = Number(reply.id);
            if (Number.isInteger(postId)) {
              deleteReply.mutate(postId, {
                onError: (error) => Alert.alert('回复没有删除', userErrorMessage(error)),
              });
            }
          },
          style: 'destructive',
          text: '删除',
        },
      ],
    );
  }

  if (!numericReviewId) {
    return <InvalidRouteState message={`这篇${contentLabel}链接缺少有效编号。`} />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          title: contentLabel,
          headerRight: () =>
            review ? (
              <HeaderShareButton
                path={`/blog/${numericReviewId}`}
                title={review.title}
              />
            ) : null,
        }}
      />
      <View style={styles.contentView}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={replies}
          initialNumToRender={8}
          keyExtractor={(reply) => reply.id}
          ListEmptyComponent={
            review && replies.length === 0 ? <EmptyDiscussionReplies /> : null
          }
          ListHeaderComponent={
            <>
              {review && reviewQuery.isError ? (
                <CachedDataNotice onRetry={() => void reviewQuery.refetch()} />
              ) : (
                <DiscussionStatus
                  errorText={`${contentLabel}读取失败，请检查网络后重试。`}
                  isError={reviewQuery.isError}
                  isPending={reviewQuery.isPending}
                  loadingText={`正在读取${contentLabel}正文和回复…`}
                  onRetry={() => void reviewQuery.refetch()}
                />
              )}
              {review ? (
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>{review.title}</Text>
                  <View style={styles.reviewMetaRow}>
                    {review.authorUsername ? (
                      <Link
                        asChild
                        href={{
                          pathname: '/user/[username]',
                          params: { username: review.authorUsername },
                        }}
                      >
                        <Pressable>
                          <Text style={styles.reviewAuthor}>
                            {review.author}
                          </Text>
                        </Pressable>
                      </Link>
                    ) : (
                      <Text style={styles.reviewAuthor}>{review.author}</Text>
                    )}
                    <Text style={styles.reviewMeta}>
                      {' · '}
                      {formatActivityTime(review.updatedAt)}
                    </Text>
                  </View>
                  <BangumiText style={styles.reviewBody}>{review.body}</BangumiText>
                  <Text style={styles.replyHeading}>
                    回复 {review.replyCount}
                  </Text>
                </View>
              ) : null}
            </>
          }
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          onRefresh={() => void reviewQuery.refetch()}
          ref={replyNavigation.listRef}
          refreshing={reviewQuery.isRefetching && !reviewQuery.isPending}
          removeClippedSubviews={Platform.OS === 'android'}
          onScroll={scrollToTop.handleScroll}
          scrollEventThrottle={80}
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onDelete={confirmDeleteReply}
              onEdit={composer.openEdit}
              onOpenReference={replyNavigation.openReply}
              onReply={composer.open}
              ownerUsername={session?.user.username}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
        {review ? (
          <View style={styles.replyBar}>
            <Pressable
              accessibilityLabel={session ? `回复${contentLabel}` : `登录后回复${contentLabel}`}
              accessibilityRole="button"
              disabled={isSigningIn}
              onPress={() => void composer.open()}
              style={({ pressed }) => [
                styles.replyButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  android: 'chat_bubble_outline',
                  ios: 'bubble.left',
                  web: 'chat_bubble_outline',
                }}
                size={17}
                tintColor={colors.muted}
              />
              <Text style={styles.replyButtonText}>
                {isSigningIn
                  ? '正在登录…'
                  : session
                    ? `回复这篇${contentLabel}…`
                    : `登录后回复${contentLabel}`}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <DiscussionReplyComposer
        {...composer.sheetProps}
        target={{ id: numericReviewId, kind: 'review' }}
      />
      <ScrollToTopButton
        onPress={scrollToTop.scrollToTop}
        visible={scrollToTop.visible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  contentView: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 28 },
  reviewHeader: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  reviewTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  reviewMetaRow: { flexDirection: 'row', marginTop: 8 },
  reviewAuthor: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  reviewMeta: { color: colors.subtle, fontSize: 12 },
  reviewBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 25,
    marginTop: 20,
  },
  replyHeading: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 22,
    paddingTop: 16,
  },
  replyBar: {
    backgroundColor: colors.background,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 76,
    paddingTop: 8,
  },
  replyButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 17,
  },
  replyButtonText: { color: colors.muted, fontSize: 14 },
  pressed: { opacity: 0.62 },
});
