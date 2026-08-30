import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useMemo, useRef } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { usePublicGroupTopic } from '@/features/community/use-community';
import { EmptyDiscussionReplies } from '@/features/discussions/empty-discussion-replies';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { DiscussionTopicBody } from '@/features/discussions/discussion-topic-body';
import { DiscussionUnavailableState } from '@/features/discussions/discussion-unavailable-state';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { ReportButton } from '@/features/reports/report-button';
import { REPORT_TYPES } from '@/features/reports/types';
import { formatActivityTime } from '@/lib/format-activity-time';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { HeaderShareButton } from '@/features/shared/header-share-button';
import { ScrollToBottomButton } from '@/features/shared/scroll-to-bottom-button';
import { TappableHeaderTitle } from '@/features/shared/tappable-header-title';
import { useScrollToBottomButton } from '@/features/shared/use-scroll-to-bottom-button';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function GroupTopicScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id, replyId } = useLocalSearchParams<{ id: string; replyId?: string }>();
  const numericTopicId = parsePositiveIntegerRouteParam(id);
  const numericReplyId = parsePositiveIntegerRouteParam(replyId);
  const { isSigningIn, session, signIn } = useAuth();
  const composer = useReplyComposer();
  const topicQuery = usePublicGroupTopic(numericTopicId ?? 0);
  const { remove: deleteReply } = useDiscussionReply({
    id: numericTopicId ?? 0,
    kind: 'group-topic',
  });
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const scrollToBottom = useScrollToBottomButton(replyNavigation.listRef);

  function scrollToTop() {
    replyNavigation.listRef.current?.scrollToOffset({
      animated: true,
      offset: 0,
    });
  }
  const appliedReplyRef = useRef(false);

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
                onError: (error) =>
                  Alert.alert('回复没有删除', userErrorMessage(error)),
              });
            }
          },
          style: 'destructive',
          text: '删除',
        },
      ],
    );
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
      <Stack.Screen
        options={{
          headerRight: () =>
            topic ? (
              <HeaderShareButton
                path={`/group/topic/${numericTopicId}`}
                title={topic.title}
              />
            ) : null,
          headerTitle: () => (
            <TappableHeaderTitle onPress={scrollToTop} title="小组话题" />
          ),
        }}
      />
      <View style={styles.contentView}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={replies}
          initialNumToRender={8}
          keyExtractor={(reply) => reply.id}
          ListEmptyComponent={topic ? <EmptyDiscussionReplies /> : null}
          ListHeaderComponent={
            <>
              {topic && topicQuery.isError ? (
                <CachedDataNotice onRetry={() => void topicQuery.refetch()} />
              ) : (
                <DiscussionStatus
                  errorText="话题读取失败，请检查网络后重试。"
                  isError={topicQuery.isError}
                  isPending={topicQuery.isPending}
                  loadingText="正在读取小组话题…"
                  onRetry={() => void topicQuery.refetch()}
                />
              )}
              {topic ? (
                <>
                  <View
                    style={[
                      styles.topicHeader,
                      topic.body && styles.topicHeaderWithBody,
                    ]}
                  >
                    <View style={styles.topicTitleRow}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <ReportButton
                        accessibilityLabel="举报该话题"
                        label={topic.title}
                        targetId={Number(topic.id)}
                        type={REPORT_TYPES.groupTopic}
                      />
                    </View>
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
                  <DiscussionTopicBody body={topic.body} />
                </>
              ) : null}
            </>
          }
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          refreshControl={
            <AppRefreshControl
              onRefresh={() => void topicQuery.refetch()}
              refreshing={topicQuery.isRefetching && !topicQuery.isPending}
            />
          }
          ref={replyNavigation.listRef}
          removeClippedSubviews={Platform.OS === 'android'}
          onContentSizeChange={scrollToBottom.handleContentSizeChange}
          onLayout={scrollToBottom.handleLayout}
          onScroll={scrollToBottom.handleScroll}
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
        {topic ? (
          <View style={styles.replyBar}>
            <Pressable
              accessibilityLabel={session ? '参与小组讨论' : '登录后参与小组讨论'}
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
                    ? '参与讨论…'
                    : '登录后参与讨论'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <DiscussionReplyComposer
        {...composer.sheetProps}
        target={{ id: numericTopicId, kind: 'group-topic' }}
      />
      <ScrollToBottomButton
        bottom={104}
        onPress={scrollToBottom.scrollToBottom}
        visible={scrollToBottom.visible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  contentView: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 28 },
  topicHeader: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  topicHeaderWithBody: { marginBottom: 10 },
  topicTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  topicTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  groupName: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  topicMeta: { color: colors.subtle, fontSize: 12, marginTop: 7 },
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
