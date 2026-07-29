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
import { useBangumiSubjectTopic } from '@/features/discussions/use-bangumi-discussions';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const topicQuery = useBangumiSubjectTopic(Number(topicId));
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);

  if (!topic && !topicQuery.isPending && !topicQuery.isError) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '话题不可用' }} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>暂时无法查看这个话题</Text>
          <Text style={styles.errorText}>
            该话题可能需要登录，也可能正在审核或已被删除。接入登录功能后可以再次尝试。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '讨论' }} />
      <View style={styles.contentView}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={replies}
          initialNumToRender={8}
          keyExtractor={(reply) => reply.id}
          ListEmptyComponent={
            topic && !topicQuery.isError ? <EmptyDiscussionReplies /> : null
          }
          ListFooterComponent={topic ? <DiscussionReadOnlyNotice /> : null}
          ListHeaderComponent={
            <>
              <DiscussionStatus
                isError={topicQuery.isError}
                isPending={topicQuery.isPending}
                onRetry={() => void topicQuery.refetch()}
              />
              {topic ? (
                <View style={styles.topicHeader}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <View style={styles.topicMetaRow}>
                    {topic.authorUsername ? (
                      <Link
                        asChild
                        href={{
                          pathname: '/user/[username]',
                          params: { username: topic.authorUsername },
                        }}
                      >
                        <Pressable>
                          <Text style={styles.topicAuthor}>{topic.author}</Text>
                        </Pressable>
                      </Link>
                    ) : (
                      <Text style={styles.topicAuthor}>{topic.author}</Text>
                    )}
                    <Text style={styles.topicMeta}> · {topic.createdAt}</Text>
                  </View>
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  contentView: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 28 },
  topicHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  topicTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  topicMetaRow: { flexDirection: 'row', marginTop: 8 },
  topicAuthor: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  topicMeta: { color: COLORS.subtle, fontSize: 13 },
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
});
