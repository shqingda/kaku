import { useState } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { EmptyDiscussionReplies } from '@/features/discussions/empty-discussion-replies';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { useSubjectReview } from '@/features/reviews/use-subject-reviews';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function SubjectReviewScreen() {
  return <ReviewDiscussionScreen kind="review" />;
}

export function ReviewDiscussionScreen({ kind }: { kind: 'blog' | 'review' }) {
  const { id, reviewId } = useLocalSearchParams<{
    id?: string;
    reviewId?: string;
  }>();
  const numericReviewId = Number(reviewId ?? id);
  const { isSigningIn, session, signIn } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DiscussionReply>();
  const reviewQuery = useSubjectReview(numericReviewId);
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
              <DiscussionStatus
                errorText={`${contentLabel}读取失败，请检查网络后重试。`}
                isError={reviewQuery.isError}
                isPending={reviewQuery.isPending}
                loadingText={`正在读取${contentLabel}正文和回复…`}
                onRetry={() => void reviewQuery.refetch()}
              />
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
                  <Text style={styles.reviewBody}>{review.body}</Text>
                  <Text style={styles.replyHeading}>
                    回复 {review.replyCount}
                  </Text>
                </View>
              ) : null}
            </>
          }
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          ref={replyNavigation.listRef}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onOpenReference={replyNavigation.openReply}
              onReply={session ? openComposer : undefined}
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
                tintColor={COLORS.muted}
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
        onClose={() => setComposerVisible(false)}
        replyingTo={replyingTo}
        target={{ id: numericReviewId, kind: 'review' }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  contentView: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 28 },
  reviewHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  reviewTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  reviewMetaRow: { flexDirection: 'row', marginTop: 8 },
  reviewAuthor: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  reviewMeta: { color: COLORS.subtle, fontSize: 12 },
  reviewBody: {
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 25,
    marginTop: 20,
  },
  replyHeading: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 22,
    paddingTop: 16,
  },
  replyBar: {
    backgroundColor: COLORS.background,
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  replyButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.track,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 17,
  },
  replyButtonText: { color: COLORS.muted, fontSize: 14 },
  pressed: { opacity: 0.62 },
});
