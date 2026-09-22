import { userErrorMessage } from '@/lib/user-error-message';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';
import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { rememberReturnTo } from '@/lib/auth-redirect';
import { useAuth } from '@/features/auth/auth-provider';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { supportsWatchProgress } from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from '@/features/collections/use-personal-collection';
import { DiscussionReplyBar, DISCUSSION_REPLY_BAR_RESERVE } from '@/features/discussions/discussion-reply-bar';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useBangumiEpisodeComments } from '@/features/discussions/use-bangumi-discussions';
import { useDiscussionReply } from '@/features/discussions/use-discussion-reply';
import { useEpisodeCommentScrollPosition } from '@/features/discussions/use-episode-comment-scroll-position';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { playEpisodeToggleHaptic, playSelectionHaptic, playWarningHaptic } from '@/lib/haptics';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '放送时间待定';
}

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
  const catalogQuery = useCatalogSubject(subjectId);
  const collectionQuery = usePersonalCollection(subjectId);
  const saveCollection = useSavePersonalCollection(subjectId);
  const catalogSubject = catalogQuery.data;
  const personalCollection = collectionQuery.data;
  const subjectType = catalogSubject?.type ?? 2;
  const isTrack = subjectType === 3;
  const tracksWatchProgress = supportsWatchProgress(subjectType);
  const totalEpisodes = catalogSubject?.totalEpisodes ?? 0;
  const isValidEpisode =
    Number.isInteger(episodeNumber) &&
    episodeNumber >= 1 &&
    episodeNumber <= totalEpisodes;
  const catalogEpisode = catalogSubject?.episodes.find(
    (episode) => episode.number === episodeNumber,
  );
  const commentsQuery = useBangumiEpisodeComments(catalogEpisode?.id);
  const { remove: deleteReply } = useDiscussionReply({
    id: catalogEpisode?.id ?? 0,
    kind: 'episode',
  });
  const replies = commentsQuery.data ?? [];
  const replyNavigation = useReplyNavigation(replies);
  const scrollPosition = useEpisodeCommentScrollPosition(
    catalogEpisode?.id,
    replyNavigation.listRef,
  );
  const {
    action: scrollAction,
    begin: beginScrollAction,
    dismiss: dismissScrollAction,
    end: endScrollAction,
    handleScroll: handleScrollAction,
  } = useScrollDirectionAction();

  const maxScrollOffsetRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const landingFrameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const cancelScrollLanding = useCallback(() => {
    if (landingFrameRef.current !== null) {
      cancelAnimationFrame(landingFrameRef.current);
      landingFrameRef.current = null;
    }
  }, []);

  // 换集、离开页面时，不能让上一页排队的滚动落到新列表上。
  useEffect(
    () => cancelScrollLanding,
    [subjectId, episodeNumber, cancelScrollLanding],
  );
  useEffect(() => {
    scrollOffsetRef.current = 0;
    maxScrollOffsetRef.current = 0;
    contentHeightRef.current = 0;
    dismissScrollAction();
  }, [catalogEpisode?.id, dismissScrollAction]);
  const handleListScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      scrollPosition.track(contentOffset.y);
      viewportHeightRef.current = layoutMeasurement.height;
      contentHeightRef.current = contentSize.height;
      maxScrollOffsetRef.current = Math.max(
        0,
        contentSize.height - layoutMeasurement.height,
      );
      handleScrollAction(contentOffset.y);
    },
    [handleScrollAction, scrollPosition.track],
  );

  // 远距离只动画最后两屏，避免几百楼挤进一次短促的原生动画。
  // 仍用 offset：这里的评论行高不固定，不依赖末楼的索引测量。
  const jumpToLatest = useCallback(() => {
    cancelScrollLanding();
    dismissScrollAction();
    const list = replyNavigation.listRef.current;
    if (!list) return;

    const bottom = maxScrollOffsetRef.current;
    const landingDistance = viewportHeightRef.current * 2;
    if (
      reduceMotion ||
      landingDistance <= 0 ||
      bottom - scrollOffsetRef.current <= landingDistance
    ) {
      list.scrollToOffset({ animated: !reduceMotion, offset: bottom + 200 });
      return;
    }

    list.scrollToOffset({ animated: false, offset: bottom - landingDistance });
    // 先提交定位并让目标附近的单元格布局，再从新位置发起原生滚动。
    // 读取最新底部，吸收这期间可变行高的测量更新。
    landingFrameRef.current = requestAnimationFrame(() => {
      landingFrameRef.current = requestAnimationFrame(() => {
        landingFrameRef.current = null;
        replyNavigation.listRef.current?.scrollToOffset({
          animated: true,
          offset: maxScrollOffsetRef.current + 200,
        });
      });
    });
  }, [
    cancelScrollLanding,
    dismissScrollAction,
    reduceMotion,
    replyNavigation.listRef,
  ]);

  const scrollToTop = useCallback(() => {
    cancelScrollLanding();
    dismissScrollAction();
    const list = replyNavigation.listRef.current;
    if (!list) return;

    const landingDistance = viewportHeightRef.current * 2;
    if (
      reduceMotion ||
      landingDistance <= 0 ||
      scrollOffsetRef.current <= landingDistance
    ) {
      list.scrollToOffset({ animated: !reduceMotion, offset: 0 });
      return;
    }

    list.scrollToOffset({ animated: false, offset: landingDistance });
    landingFrameRef.current = requestAnimationFrame(() => {
      landingFrameRef.current = requestAnimationFrame(() => {
        landingFrameRef.current = null;
        replyNavigation.listRef.current?.scrollToOffset({
          animated: true,
          offset: 0,
        });
      });
    });
  }, [
    cancelScrollLanding,
    dismissScrollAction,
    reduceMotion,
    replyNavigation.listRef,
  ]);
  const episodeUnit = isTrack ? '曲' : '集';
  const episodeList = useMemo(
    () =>
      [...(catalogSubject?.episodes ?? [])].sort(
        (left, right) => left.number - right.number,
      ),
    [catalogSubject?.episodes],
  );
  const currentEpisodeIndex = episodeList.findIndex(
    (episode) => episode.number === episodeNumber,
  );
  const previousEpisode =
    currentEpisodeIndex > 0 ? episodeList[currentEpisodeIndex - 1] : undefined;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeList.length - 1
      ? episodeList[currentEpisodeIndex + 1]
      : undefined;

  function openEpisode(nextNumber: number) {
    cancelScrollLanding();
    scrollPosition.save();
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
  const airDate = catalogEpisode?.airDate;
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
                scrollToTop();
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
                  commentsQuery.refetch(),
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
          onScroll={handleListScroll}
          onMomentumScrollEnd={scrollPosition.save}
          onScrollBeginDrag={(event) => {
            cancelScrollLanding();
            beginScrollAction(event.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={() => {
            endScrollAction();
            scrollPosition.save();
          }}
          onLayout={(event) => {
            viewportHeightRef.current = event.nativeEvent.layout.height;
            maxScrollOffsetRef.current = Math.max(
              0, contentHeightRef.current - viewportHeightRef.current,
            );
            if (commentsQuery.data && contentHeightRef.current > 0) {
              scrollPosition.restore(maxScrollOffsetRef.current);
            }
          }}
          onContentSizeChange={(_width, height) => {
            contentHeightRef.current = height;
            maxScrollOffsetRef.current = Math.max(
              0, height - viewportHeightRef.current,
            );
            if (commentsQuery.data && viewportHeightRef.current > 0) {
              scrollPosition.restore(maxScrollOffsetRef.current);
            }
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={
            commentsQuery.isPending ||
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
              <View style={styles.episodeCard}>
                <Text style={styles.subjectTitle}>{subjectTitle}</Text>
                <Text style={styles.episodeTitle}>
                  第 {episodeNumber} {isTrack ? '曲' : '集'}
                </Text>
                {catalogEpisode?.title ? (
                  <Text style={styles.catalogEpisodeTitle}>
                    {catalogEpisode.title}
                  </Text>
                ) : null}
                <View style={styles.metaLine}>
                  {tracksWatchProgress ? (
                    <Pressable
                      accessibilityLabel={
                        isWatched ? '将本集设为未看' : '将本集标记已看'
                      }
                      accessibilityRole="button"
                      hitSlop={HIT_SLOP}
                      disabled={saveCollection.isPending}
                      onPress={() => void toggleRemoteProgress()}
                      style={({ pressed }) => [
                        styles.statusBadge,
                        isWatched && styles.watchedStatusBadge,
                        pressed && styles.pressedStatusBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isWatched && styles.watchedStatusText,
                        ]}
                      >
                        {isWatched ? '已看' : '未看'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Text style={styles.airDate}>
                    {isTrack
                      ? catalogEpisode?.duration || '时长待定'
                      : `${formatAirDate(airDate)} 放送`}
                  </Text>
                </View>
                <Text style={styles.description}>
                  {catalogEpisode?.description ||
                    `本${isTrack ? '曲' : '集'}简介暂时缺失，稍后可以重试 Bangumi 数据。`}
                </Text>
                {previousEpisode || nextEpisode ? (
                  <View style={styles.episodeNavRow}>
                    {previousEpisode ? (
                      <Pressable
                        accessibilityLabel={`跳转到上一${episodeUnit}：第 ${previousEpisode.number} ${episodeUnit}`}
                        accessibilityRole="button"
                        hitSlop={SPACING.xs}
                        onPress={() => openEpisode(previousEpisode.number)}
                        style={({ pressed }) => [
                          styles.episodeNavButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <SymbolView
                          name={{
                            android: 'chevron_left',
                            ios: 'chevron.left',
                            web: 'chevron_left',
                          }}
                          size={15}
                          tintColor={colors.accent}
                          weight="semibold"
                        />
                        <Text
                          maxFontSizeMultiplier={1.3}
                          numberOfLines={1}
                          style={styles.episodeNavText}
                        >{`上一${episodeUnit}`}</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.episodeNavSpacer} />
                    )}
                    {nextEpisode ? (
                      <Pressable
                        accessibilityLabel={`跳转到下一${episodeUnit}：第 ${nextEpisode.number} ${episodeUnit}`}
                        accessibilityRole="button"
                        hitSlop={SPACING.xs}
                        onPress={() => openEpisode(nextEpisode.number)}
                        style={({ pressed }) => [
                          styles.episodeNavButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          maxFontSizeMultiplier={1.3}
                          numberOfLines={1}
                          style={styles.episodeNavText}
                        >{`下一${episodeUnit}`}</Text>
                        <SymbolView
                          name={{
                            android: 'chevron_right',
                            ios: 'chevron.right',
                            web: 'chevron_right',
                          }}
                          size={15}
                          tintColor={colors.accent}
                          weight="semibold"
                        />
                      </Pressable>
                    ) : (
                      <View style={styles.episodeNavSpacer} />
                    )}
                  </View>
                ) : null}
              </View>
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
              {commentsQuery.data && commentsQuery.isError ? (
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
                cancelScrollLanding();
                replyNavigation.openReply(replyId);
              }}
              onReply={composer.open}
              ownerUsername={session?.user.username}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
        {catalogEpisode ? (
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
      <ScrollToTopButton
        accessibilityHint="滚动到本集评论顶部"
        accessibilityLabel="回到顶部"
        bottom={DISCUSSION_REPLY_BAR_RESERVE - SPACING.sm}
        onPress={scrollToTop}
        visible={scrollAction === 'top'}
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
        onPress={jumpToLatest}
        visible={scrollAction === 'bottom'}
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
  episodeCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SPACING.xl,
  },
  subjectTitle: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  episodeTitle: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  catalogEpisodeTitle: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  metaLine: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  statusBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  watchedStatusBadge: { backgroundColor: colors.accent },
  pressedStatusBadge: { opacity: 0.65 },
  statusText: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  watchedStatusText: { color: colors.surface },
  airDate: { color: colors.subtle, ...TYPE.caption },
  description: { color: colors.muted, ...TYPE.body, marginTop: SPACING.lg },
  episodeNavRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg + SPACING.xs,
  },
  episodeNavButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    flexDirection: 'row',
    flex: 1,
    gap: SPACING.xs,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
  },
  episodeNavText: {
    color: colors.accent,
    flexShrink: 1,
    ...TYPE.body,
    fontWeight: '700',
  },
  episodeNavSpacer: { flex: 1 },
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
