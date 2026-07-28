import { useCallback, useRef } from 'react';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { usePublicGroupTopic } from '@/features/community/use-community';
import { DiscussionComposer } from '@/features/discussions/discussion-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function GroupTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicQuery = usePublicGroupTopic(Number(id));
  const topic = topicQuery.data;
  const replies = topic?.replies ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const inputRef = useRef<TextInput>(null);
  const focusComposer = useCallback(() => inputRef.current?.focus(), []);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '小组话题' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardView}
      >
        <FlatList
          contentContainerStyle={styles.listContent}
          data={replies}
          initialNumToRender={8}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(reply) => reply.id}
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
          ref={replyNavigation.listRef}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onOpenReference={replyNavigation.openReply}
              onReply={focusComposer}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />

        <DiscussionComposer
          disabledReason="真实发布需要 Bangumi 登录和人机验证，登录流程接通后开放。"
          draft=""
          inputRef={inputRef}
          onCancelReply={() => {}}
          onChangeDraft={() => {}}
          onSend={() => {}}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  keyboardView: { flex: 1 },
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
});
