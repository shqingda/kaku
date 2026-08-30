import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { EmptyDiscussionReplies } from '@/features/discussions/empty-discussion-replies';
import { DiscussionUnavailableState } from '@/features/discussions/discussion-unavailable-state';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { DiscussionTopicBody } from '@/features/discussions/discussion-topic-body';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useBangumiSubjectTopic } from '@/features/discussions/use-bangumi-discussions';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { ReportButton } from '@/features/reports/report-button';
import { ReportSheet } from '@/features/reports/report-sheet';
import { REPORT_TYPES } from '@/features/reports/types';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToBottomButton } from '@/features/shared/scroll-to-bottom-button';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollToBottomButton } from '@/features/shared/use-scroll-to-bottom-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function TopicScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { replyId, topicId } = useLocalSearchParams<{
    replyId?: string;
    topicId: string;
  }>();
  const numericTopicId = parsePositiveIntegerRouteParam(topicId);
  const numericReplyId = parsePositiveIntegerRouteParam(replyId);
  const { isSigningIn, session, signIn } = useAuth();
  const composer = useReplyComposer();
  const [reportTarget, setReportTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const topicQuery = useBangumiSubjectTopic(numericTopicId ?? 0);
  const { remove: deleteReply } = useDiscussionReply({
    id: numericTopicId ?? 0,
    kind: 'subject-topic',
  });
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const scrollToTop = useScrollToTopButton(replyNavigation.listRef);
  const scrollToBottom = useScrollToBottomButton(replyNavigation.listRef);
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
    return <InvalidRouteState message="这个讨论链接缺少有效编号。" />;
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
          ListEmptyComponent={topic ? <EmptyDiscussionReplies /> : null}
          ListHeaderComponent={
            <>
              {topic && topicQuery.isError ? (
                <CachedDataNotice onRetry={() => void topicQuery.refetch()} />
              ) : (
                <DiscussionStatus
                  isError={topicQuery.isError}
                  isPending={topicQuery.isPending}
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
                          type={REPORT_TYPES.subjectTopic}
                        />
                      </View>
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
                            <Text style={styles.topicAuthor}>
                              {topic.author}
                            </Text>
                          </Pressable>
                        </Link>
                      ) : (
                        <Text style={styles.topicAuthor}>{topic.author}</Text>
                      )}
                      <Text style={styles.topicMeta}> · {topic.createdAt}</Text>
                    </View>
                  </View>
                  <DiscussionTopicBody body={topic.body} />
                </>
              ) : null}
            </>
          }
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          onRefresh={() => void topicQuery.refetch()}
          ref={replyNavigation.listRef}
          refreshing={topicQuery.isRefetching && !topicQuery.isPending}
          removeClippedSubviews={Platform.OS === 'android'}
          onContentSizeChange={scrollToBottom.handleContentSizeChange}
          onLayout={scrollToBottom.handleLayout}
          onScroll={(event) => {
            scrollToTop.handleScroll(event);
            scrollToBottom.handleScroll(event);
          }}
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
        {topic ? (
          <View style={styles.replyBar}>
            <Pressable
              accessibilityLabel={session ? '参与讨论' : '登录后参与讨论'}
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
        target={{ id: numericTopicId, kind: 'subject-topic' }}
      />
      <ReportSheet
        onClose={() => setReportTarget(null)}
        onSubmitted={() =>
          Alert.alert('举报已提交', '感谢你的反馈，Bangumi 会进行审核。')
        }
        target={
          reportTarget
            ? { ...reportTarget, type: REPORT_TYPES.subjectReply }
            : { id: 0, label: '', type: REPORT_TYPES.subjectReply }
        }
        visible={reportTarget !== null}
      />
      <ScrollToTopButton
        bottom={104}
        onPress={scrollToTop.scrollToTop}
        visible={scrollToTop.visible}
      />
      <ScrollToBottomButton
        bottom={156}
        onPress={scrollToBottom.scrollToBottom}
        visible={scrollToBottom.visible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  contentView: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 20 },
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
  topicMetaRow: { flexDirection: 'row', marginTop: 8 },
  topicAuthor: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  topicMeta: { color: colors.subtle, fontSize: 13 },
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
