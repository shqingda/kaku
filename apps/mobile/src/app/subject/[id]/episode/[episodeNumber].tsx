import { EpisodeDetailsCard } from '@/features/discussions/episode-details-card';
import { useEpisodeDiscussion } from '@/features/discussions/use-episode-discussion';
import { useEpisodeDiscussionScroll } from '@/features/discussions/use-episode-discussion-scroll';
import { userErrorMessage } from '@/lib/user-error-message';
import { FlashList } from '@shopify/flash-list';
import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { rememberReturnTo } from '@/lib/auth-redirect';
import { useAuth } from '@/features/auth/auth-provider';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { DiscussionReplyBar, DISCUSSION_REPLY_BAR_RESERVE } from '@/features/discussions/discussion-reply-bar';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { EpisodeScrollActionButton } from '@/features/discussions/episode-scroll-action-button';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { playEpisodeToggleHaptic, playSelectionHaptic, playWarningHaptic } from '@/lib/haptics';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
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
  const replyNavigation = useReplyNavigation(replies);
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

  if (catalogQuery.isPending) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen
          options={{ title: `第 ${episodeNumber} ${isTrack ? '曲' : '集'}` }}
        />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>
            正在读取{isTrack ? '曲目' : '章节'}
          </Text>
          <Text style={styles.errorText}>
            正在从 Bangumi 获取{isTrack ? '曲目' : '章节'}资料。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (catalogQuery.isError && !catalogSubject) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen
          options={{ title: `第 ${episodeNumber} ${isTrack ? '曲' : '集'}` }}
        />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>
            {isTrack ? '曲目' : '章节'}资料读取失败
          </Text>
          <Text style={styles.errorText}>请检查网络后重试。</Text>
          <Pressable
            accessibilityLabel={`重新读取${isTrack ? '曲目' : '章节'}资料`}
            accessibilityRole="button"
            onPress={() => void catalogQuery.refetch()}
            style={({ pressed }) => [
              styles.errorRetry,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.errorRetryText}>重试</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isValidEpisode) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen
          options={{ title: isTrack ? '曲目不存在' : '章节不存在' }}
        />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>
            没有找到这一{isTrack ? '曲' : '集'}
          </Text>
          <Text style={styles.errorText}>
            {isTrack ? '曲目' : '集数'}可能已经变化，请返回条目详情页。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isWatched =
    tracksWatchProgress &&
    (personalCollection?.watchedEpisodeNumbers.includes(episodeNumber) ??
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

    const currentNumbers = personalCollection?.watchedEpisodeNumbers ?? [];
    const watchedEpisodeNumbers = isWatched
      ? currentNumbers.filter((number) => number !== episodeNumber)
      : [...currentNumbers, episodeNumber].sort((left, right) => left - right);
    const currentStatus = personalCollection?.collectionStatus;

    try {
      // 只在状态真正变化时携带 collectionStatus：Bangumi v0 API 对
      // 携带 type 的每次 PUT 都会生成一条时间线事件，无变化的保存应当
      // 保持安静（与官网行为一致）。
      const nextStatus =
        !currentStatus || currentStatus === 'wish' ? 'doing' : currentStatus;
      await saveCollection.mutateAsync({
        ...(nextStatus !== currentStatus ? { collectionStatus: nextStatus } : {}),
        watchedEpisodeNumbers,
      });
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
              <View style={styles.emptyDiscussion}>
                <Text style={styles.emptyTitle}>
                  还没有人讨论这一{isTrack ? '曲' : '集'}
                </Text>
                <Text style={styles.emptyText}>
                  Bangumi 暂无本{isTrack ? '曲' : '集'}评论。
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              <EpisodeDetailsCard
                episode={catalogEpisode}
                episodeNumber={episodeNumber}
                subjectTitle={subjectTitle}
                isTrack={isTrack}
                tracksWatchProgress={tracksWatchProgress}
                isWatched={isWatched}
                isSaving={saveCollection.isPending}
                previousEpisode={previousEpisode}
                nextEpisode={nextEpisode}
                openEpisode={openEpisode}
                onToggleProgress={() => void toggleRemoteProgress()}
              />
              <CatalogStatusBanner
                fromOfflinePack={catalogQuery.data?.offlineSource === 'pack'}
                isError={catalogQuery.isError}
                isPending={catalogQuery.isPending}
                isRefreshing={catalogQuery.isFetching && !catalogQuery.isPending}
                onRetry={() => void catalogQuery.refetch()}
              />
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  本{isTrack ? '曲' : '集'}讨论
                </Text>
                <Text style={styles.remoteReplyCount}>
                  Bangumi {catalogEpisode?.discussionCount ?? replies.length}
                </Text>
              </View>
              {hiddenDiscussion ? (
                <View style={styles.emptyDiscussion}>
                  <Text style={styles.emptyTitle}>讨论已折叠</Text>
                  <Text style={styles.emptyText}>防剧透已开启。当前章节尚未标记已看，或观看进度未知；从通知进入也需手动展开。</Text>
                  <Pressable accessibilityRole="button" onPress={revealDiscussion} style={styles.spoilerButton}>
                    <Text style={styles.spoilerAction}>仅本次展开讨论</Text>
                  </Pressable>
                </View>
              ) : commentsQuery.data && commentsQuery.isError ? (
                <CachedDataNotice
                  onRetry={() => void commentsQuery.refetch()}
                />
              ) : (
                <DiscussionStatus
                  isError={commentsQuery.isError}
                  isPending={
                    catalogQuery.isPending ||
                    Boolean(catalogEpisode && commentsQuery.isPending)
                  }
                  onRetry={() => void commentsQuery.refetch()}
                />
              )}
            </>
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
        <>
          <DiscussionReplyComposer
            {...composer.sheetProps}
            target={{ id: catalogEpisode.id, kind: 'episode' }}
          />
        </>
      ) : null}
      {Platform.OS === 'android' ? (
        <EpisodeScrollActionButton
          action={scroll.scrollAction}
          bottom={DISCUSSION_REPLY_BAR_RESERVE - SPACING.sm}
          onBottom={scroll.jumpToLatest}
          onTop={scroll.scrollToTop}
        />
      ) : (
        <>
          <ScrollToTopButton
            accessibilityHint="滚动到本集评论顶部"
            accessibilityLabel="回到顶部"
            bottom={DISCUSSION_REPLY_BAR_RESERVE - SPACING.sm}
            onPress={scroll.scrollToTop}
            visible={scroll.scrollAction === 'top'}
          />
          <ScrollToTopButton
            accessibilityHint="滚动到本集最新一条回复"
            accessibilityLabel="跳到最新回复"
            bottom={DISCUSSION_REPLY_BAR_RESERVE - SPACING.sm}
            icon={{
              android: 'arrow_downward',
              ios: 'arrow.down',
              web: 'arrow_downward',
            }}
            onPress={scroll.jumpToLatest}
            visible={scroll.scrollAction === 'bottom'}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  spoilerButton: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center', marginTop: SPACING.md },
  spoilerAction: { ...TYPE.body, color: colors.accent },
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  content: { padding: SPACING.lg + SPACING.xs },
  headerTitleButton: {
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.sm,
  },
  headerTitleText: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: { color: colors.ink, ...TYPE.title, fontWeight: '800' },
  remoteReplyCount: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  emptyDiscussion: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: SPACING.xl + SPACING.xs,
  },
  emptyTitle: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  emptyText: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  errorState: { flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  errorTitle: { color: colors.ink, ...TYPE.titleLarge, fontWeight: '700' },
  errorText: { color: colors.muted, ...TYPE.body, marginTop: SPACING.sm },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  errorRetryText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },

  pressed: { opacity: 0.62 },
});
