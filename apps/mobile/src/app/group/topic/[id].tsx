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
import { usePublicGroupTopic } from '@/features/community/use-community';
import { EmptyDiscussionReplies } from '@/features/discussions/empty-discussion-replies';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { DiscussionUnavailableState } from '@/features/discussions/discussion-unavailable-state';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { formatActivityTime } from '@/lib/format-activity-time';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function GroupTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericTopicId = parsePositiveIntegerRouteParam(id);
  const { isSigningIn, session, signIn } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DiscussionReply>();
  const topicQuery = usePublicGroupTopic(numericTopicId ?? 0);
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);

  async function openComposer(reply?: DiscussionReply) {
    if (!session) {
      const signedIn = await signIn();
      if (!signedIn) return;
    }

    setReplyingTo(reply);
    setComposerVisible(true);
  }

  if (!numericTopicId) {
    return <InvalidRouteState message="这个小组话题链接缺少有效编号。" />;
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
      <Stack.Screen options={{ title: '小组话题' }} />
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
                errorText="话题读取失败，请检查网络后重试。"
                isError={topicQuery.isError}
                isPending={topicQuery.isPending}
                loadingText="正在读取小组话题…"
                onRetry={() => void topicQuery.refetch()}
              />
              {topic ? (
                <View style={styles.topicHeader}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  {topic.groupName ? (
                    <Link
                      asChild
                      href={{
                        pathname: '/group/[name]',
                        params: { name: topic.groupName },
                      }}
                    >
                      <Pressable>
                        <Text style={styles.groupName}>
                          {topic.groupTitle}
                        </Text>
                      </Pressable>
                    </Link>
                  ) : null}
                  <Text style={styles.topicMeta}>
                    {topic.author} · {formatActivityTime(topic.updatedAt)}
                  </Text>
                </View>
              ) : null}
            </>
          }
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          onRefresh={() => void topicQuery.refetch()}
          ref={replyNavigation.listRef}
          refreshing={topicQuery.isRefetching && !topicQuery.isPending}
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
              accessibilityLabel={session ? '参与小组讨论' : '登录后参与小组讨论'}
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
        target={{ id: numericTopicId, kind: 'group-topic' }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
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
  groupName: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  topicMeta: { color: COLORS.subtle, fontSize: 12, marginTop: 7 },
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
