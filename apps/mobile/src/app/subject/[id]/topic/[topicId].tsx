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
import { EmptyDiscussionReplies } from '@/features/discussions/discussion-read-only';
import { DiscussionUnavailableState } from '@/features/discussions/discussion-unavailable-state';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useBangumiSubjectTopic } from '@/features/discussions/use-bangumi-discussions';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const numericTopicId = Number(topicId);
  const { isSigningIn, session, signIn } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DiscussionReply>();
  const topicQuery = useBangumiSubjectTopic(numericTopicId);
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);

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

  if (!topic && !topicQuery.isPending && !topicQuery.isError) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '话题不可用' }} />
        <DiscussionUnavailableState
          isSigningIn={isSigningIn}
          onRetry={() => void topicQuery.refetch()}
          onSignIn={() => void signIn()}
          signedIn={Boolean(session)}
        />
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
              onReply={session ? openComposer : undefined}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
        {topic ? (
          <View style={styles.replyBar}>
            <Pressable
              accessibilityLabel={session ? '参与讨论' : '登录后参与讨论'}
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
                    ? '参与讨论…'
                    : '登录后参与讨论'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <DiscussionReplyComposer
        onClose={() => setComposerVisible(false)}
        replyingTo={replyingTo}
        target={{ id: numericTopicId, kind: 'subject-topic' }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  contentView: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 20 },
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
