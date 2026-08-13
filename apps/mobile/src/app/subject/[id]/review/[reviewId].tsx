import { useMemo, useState } from 'react';
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
import { useDeleteReviewReply } from '@/features/discussions/use-delete-reply';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { ReportSheet } from '@/features/reports/report-sheet';
import { REPORT_TYPES } from '@/features/reports/types';
import { useSubjectReview } from '@/features/reviews/use-subject-reviews';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id, reviewId } = useLocalSearchParams<{
    id?: string;
    reviewId?: string;
  }>();
  const numericReviewId = parsePositiveIntegerRouteParam(reviewId ?? id);
  const { isSigningIn, session, signIn } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DiscussionReply>();
  const [editingReply, setEditingReply] = useState<DiscussionReply | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const reviewQuery = useSubjectReview(numericReviewId ?? 0);
  const deleteReply = useDeleteReviewReply(numericReviewId ?? 0);
  const review = reviewQuery.data;
  const replies = review?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const contentLabel = kind === 'blog' ? '日志' : '评论';

  async function openComposer(reply?: DiscussionReply) {
    if (!session) {
      const signedIn = await signIn();
      if (!signedIn) {
        return;
      }
    }

    setReplyingTo(reply);
    setComposerVisible(true);
  }

  function openEditComposer(reply: DiscussionReply) {
    setReplyingTo(undefined);
    setEditingReply(reply);
    setComposerVisible(true);
  }

  function closeComposer() {
    setComposerVisible(false);
    setEditingReply(null);
  }

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
                onError: (error) => Alert.alert('回复没有删除', error.message),
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
      <Stack.Screen options={{ title: contentLabel }} />
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
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onDelete={
                item.authorUsername === session?.user.username
                  ? confirmDeleteReply
                  : undefined
              }
              onEdit={
                item.authorUsername === session?.user.username
                  ? openEditComposer
                  : undefined
              }
              onOpenReference={replyNavigation.openReply}
              onReply={openComposer}
              onReport={
                session && item.authorUsername !== session.user.username
                  ? (reply) =>
                      setReportTarget({
                        id: Number(reply.id),
                        label: reply.author,
                      })
                  : undefined
              }
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
              onPress={() => void openComposer()}
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
        editing={
          editingReply
            ? { content: editingReply.body, postId: Number(editingReply.id) }
            : null
        }
        onClose={closeComposer}
        onEdited={() => setEditingReply(null)}
        replyingTo={replyingTo}
        target={{ id: numericReviewId, kind: 'review' }}
        visible={composerVisible}
      />
      <ReportSheet
        onClose={() => setReportTarget(null)}
        onSubmitted={() =>
          Alert.alert('举报已提交', '感谢你的反馈，Bangumi 会进行审核。')
        }
        target={
          reportTarget
            ? { ...reportTarget, type: REPORT_TYPES.blogReply }
            : { id: 0, label: '', type: REPORT_TYPES.blogReply }
        }
        visible={reportTarget !== null}
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
    paddingHorizontal: 20,
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
