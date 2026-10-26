import { useEpisodeDiscussion } from '@/features/discussions/use-episode-discussion';
import { useEpisodeDiscussionScroll } from '@/features/discussions/use-episode-discussion-scroll';
import { userErrorMessage } from '@/lib/user-error-message';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { rememberReturnTo } from '@/lib/auth-redirect';
import { useAuth } from '@/features/auth/auth-provider';
import { DiscussionReplyBar, DISCUSSION_REPLY_BAR_RESERVE } from '@/features/discussions/discussion-reply-bar';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { EpisodeDiscussionHeader, EpisodeEmptyDiscussion } from '@/features/discussions/episode-discussion-header';
import { episodeProgressUpdate } from '@/features/discussions/episode-progress';
import { EpisodeScreenState } from '@/features/discussions/episode-screen-state';
import { EpisodeScrollButtons } from '@/features/discussions/episode-scroll-buttons';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { playEpisodeToggleHaptic, playSelectionHaptic, playWarningHaptic } from '@/lib/haptics';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function EpisodeScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const pathname = usePathname();
  const { episodeNumber: episodeParam, id } = useLocalSearchParams<{
    episodeNumber: string;
    id: string;
  }>();
  const { isSigningIn, session } = useAuth();
  const composer = useReplyComposer();
  const parsedSubjectId = parsePositiveIntegerRouteParam(id);
  const parsedEpisodeNumber = parsePositiveIntegerRouteParam(episodeParam);
  const subjectId = parsedSubjectId ?? 0;
  const episodeNumber = parsedEpisodeNumber ?? 0;
  const {
    catalogQuery, collectionQuery, saveCollection, commentsQuery,
    catalogSubject, catalogEpisode, personalCollection,
    isTrack, tracksWatchProgress, isValidEpisode, episodeUnit,
    previousEpisode, nextEpisode, hiddenDiscussion, replies, revealDiscussion,
  } = useEpisodeDiscussion(subjectId, episodeNumber, session?.user.id);
  const { remove: deleteReply } = useDiscussionReply({
    id: catalogEpisode?.id ?? 0,
    kind: 'episode',
  });
  const replyNavigation = useReplyNavigation<FlashListRef<DiscussionReply>>(replies);
  const scroll = useEpisodeDiscussionScroll({
    canRestore: !hiddenDiscussion && Boolean(commentsQuery.data),
    episodeId: catalogEpisode?.id,
    listRef: replyNavigation.listRef,
    scope: `${subjectId}:${episodeNumber}`,
  });

  function openEpisode(nextNumber: number) {
    scroll.cancelScrollLanding();
    scroll.save();
    router.replace({
      pathname: '/subject/[id]/episode/[episodeNumber]',
      params: { id: String(subjectId), episodeNumber: String(nextNumber) },
    });
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
                onError: (error) => Alert.alert('回复没有删除', userErrorMessage(error)),
                onSuccess: () => playWarningHaptic(),
              });
            }
          },
          style: 'destructive',
          text: '删除',
        },
      ],
    );
  }

  if (!parsedSubjectId || !parsedEpisodeNumber) {
    return <InvalidRouteState message="这个章节链接缺少有效编号。" />;
  }

  const screenTitle = `第 ${episodeNumber} ${isTrack ? '曲' : '集'}`;
  const itemNoun = isTrack ? '曲目' : '章节';

  if (catalogQuery.isPending) {
    return (
      <EpisodeScreenState
        screenTitle={screenTitle}
        text={`正在从 Bangumi 获取${itemNoun}资料。`}
        title={`正在读取${itemNoun}`}
      />
    );
  }

  if (catalogQuery.isError && !catalogSubject) {
    return (
      <EpisodeScreenState
        onRetry={() => void catalogQuery.refetch()}
        retryLabel={`重新读取${itemNoun}资料`}
        screenTitle={screenTitle}
        text="请检查网络后重试。"
        title={`${itemNoun}资料读取失败`}
      />
    );
  }

  if (!isValidEpisode) {
    return (
      <EpisodeScreenState
        screenTitle={isTrack ? '曲目不存在' : '章节不存在'}
        text={`${isTrack ? '曲目' : '集数'}可能已经变化，请返回条目详情页。`}
        title={`没有找到这一${isTrack ? '曲' : '集'}`}
      />
    );
  }

  const isWatched =
    tracksWatchProgress &&
    (personalCollection?.watchedEpisodeIds?.includes(catalogEpisode?.id ?? 0) ??
      false);
  const subjectTitle = catalogSubject?.title ?? '未知条目';
  const headerTitle = `第 ${episodeNumber} ${episodeUnit}`;

  async function toggleRemoteProgress() {
    if (!session) {
      Alert.alert(
        '登录后标记进度',
        '章节进度会保存到你的 Bangumi 账户。',
        [
          { style: 'cancel', text: '取消' },
          {
            onPress: () => {
              rememberReturnTo(pathname);
              router.push('/account');
            },
            text: '去登录',
          },
        ],
      );
      return;
    }

    if (collectionQuery.isPending || collectionQuery.isError) {
      Alert.alert('进度尚未就绪', '请先等待收藏盒同步完成，或重试同步。');
      return;
    }

    if (!catalogEpisode) {
      Alert.alert('章节尚未就绪', '请先刷新章节资料后再标记进度。');
      return;
    }
    try {
      await saveCollection.mutateAsync(
        episodeProgressUpdate(personalCollection?.collectionStatus, catalogEpisode.id, !isWatched),
      );
      playEpisodeToggleHaptic(isWatched);
    } catch (error) {
      Alert.alert(
        '进度没有保存',
        error instanceof Error ? userErrorMessage(error) : '请稍后重试。',
      );
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              accessibilityHint="滚动到本集评论顶部"
              accessibilityLabel={`${headerTitle}，回到顶部`}
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              onPress={() => {
                playSelectionHaptic();
                scroll.scrollToTop();
              }}
              style={({ pressed }) => [
                styles.headerTitleButton,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.headerTitleText}>
                {headerTitle}
              </Text>
            </Pressable>
          ),
          title: headerTitle,
        }}
      />
      <FlashList
          style={styles.list}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: DISCUSSION_REPLY_BAR_RESERVE },
          ]}
          data={replies}
          keyExtractor={(reply) => reply.id}
          ref={replyNavigation.listRef}
          refreshControl={
            <AppRefreshControl
              onRefresh={() =>
                void Promise.all([
                  catalogQuery.refetch(),
                  ...(!hiddenDiscussion ? [commentsQuery.refetch()] : []),
                  ...(session ? [collectionQuery.refetch()] : []),
                ])
              }
              refreshing={
                (catalogQuery.isRefetching ||
                  commentsQuery.isRefetching ||
                  collectionQuery.isRefetching) &&
                !catalogQuery.isPending &&
                !commentsQuery.isPending
              }
            />
          }
          {...scroll.listProps}
          scrollEventThrottle={16}
          ListEmptyComponent={
            hiddenDiscussion || commentsQuery.isPending ||
            (commentsQuery.isError && !commentsQuery.data) ? null : (
              <EpisodeEmptyDiscussion isTrack={isTrack} />
            )
          }
          ListHeaderComponent={
            <EpisodeDiscussionHeader
              catalog={{
                hasData: Boolean(catalogQuery.data),
                isError: catalogQuery.isError,
                isFetching: catalogQuery.isFetching,
                isPending: catalogQuery.isPending,
                refetch: () => void catalogQuery.refetch(),
              }}
              comments={{
                hasData: Boolean(commentsQuery.data),
                isError: commentsQuery.isError,
                isFetching: commentsQuery.isFetching,
                isPending: commentsQuery.isPending,
                refetch: () => void commentsQuery.refetch(),
              }}
              details={{
                episode: catalogEpisode,
                episodeNumber,
                isSaving: saveCollection.isPending,
                isTrack,
                isWatched,
                nextEpisode,
                onToggleProgress: () => void toggleRemoteProgress(),
                openEpisode,
                previousEpisode,
                subjectTitle,
                tracksWatchProgress,
              }}
              discussionCount={catalogEpisode?.discussionCount ?? replies.length}
              fromOfflinePack={catalogQuery.data?.offlineSource === 'pack'}
              hiddenDiscussion={hiddenDiscussion}
              isTrack={isTrack}
              onRevealDiscussion={revealDiscussion}
            />
          }
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onDelete={confirmDeleteReply}
              onEdit={composer.openEdit}
              onOpenReference={(replyId) => {
                scroll.cancelScrollLanding();
                replyNavigation.openReply(replyId);
              }}
              onReply={composer.open}
              ownerUsername={session?.user.username}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
        {catalogEpisode && !hiddenDiscussion ? (
          <DiscussionReplyBar
            accessibilityLabel={session ? '参与讨论' : '登录后参与讨论'}
            disabled={isSigningIn}
            label={
              isSigningIn
                ? '正在登录…'
                : session
                  ? `参与本${isTrack ? '曲' : '集'}讨论…`
                  : '登录后参与讨论'
            }
            onPress={() => void composer.open()}
          />
        ) : null}
      {catalogEpisode ? (
        <DiscussionReplyComposer
          {...composer.sheetProps}
          target={{ id: catalogEpisode.id, kind: 'episode' }}
        />
      ) : null}
      <EpisodeScrollButtons
        action={scroll.scrollAction}
        bottom={DISCUSSION_REPLY_BAR_RESERVE - SPACING.sm}
        onBottom={scroll.jumpToLatest}
        onTop={scroll.scrollToTop}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  content: { padding: SPACING.lg + SPACING.xs },
  headerTitleButton: {
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.sm,
  },
  headerTitleText: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
