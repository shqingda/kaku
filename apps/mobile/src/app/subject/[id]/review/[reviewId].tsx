import { Link, Stack, useLocalSearchParams } from 'expo-router';
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
import {
  DiscussionReadOnlyNotice,
  EmptyDiscussionReplies,
} from '@/features/discussions/discussion-read-only';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { useSubjectReview } from '@/features/reviews/use-subject-reviews';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function SubjectReviewScreen() {
  const { id, reviewId } = useLocalSearchParams<{
    id?: string;
    reviewId?: string;
  }>();
  const reviewQuery = useSubjectReview(Number(reviewId ?? id));
  const review = reviewQuery.data;
  const replies = review?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '评论' }} />
      <View style={styles.contentView}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={replies}
          initialNumToRender={8}
          keyExtractor={(reply) => reply.id}
          ListEmptyComponent={
            review && replies.length === 0 ? <EmptyDiscussionReplies /> : null
          }
          ListFooterComponent={review ? <DiscussionReadOnlyNotice /> : null}
          ListHeaderComponent={
            <>
              <DiscussionStatus
                errorText="评论读取失败，请检查网络后重试。"
                isError={reviewQuery.isError}
                isPending={reviewQuery.isPending}
                loadingText="正在读取评论正文和回复…"
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
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  contentView: { flex: 1 },
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
});
