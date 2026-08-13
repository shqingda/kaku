import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Alert,
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
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { supportsWatchProgress } from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from '@/features/collections/use-personal-collection';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import { DiscussionComposeButton } from '@/features/discussions/discussion-compose-button';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useBangumiEpisodeComments } from '@/features/discussions/use-bangumi-discussions';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { playEpisodeToggleHaptic } from '@/lib/haptics';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '放送时间待定';
}

export default function EpisodeScreen() {
  const { episodeNumber: episodeParam, id } = useLocalSearchParams<{
    episodeNumber: string;
    id: string;
  }>();
  const { isSigningIn, session, signIn } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DiscussionReply>();
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
  const replies = commentsQuery.data ?? [];
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

  if (catalogQuery.isError) {
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

  async function toggleRemoteProgress() {
    if (!session) {
      Alert.alert(
        '登录后标记进度',
        '章节进度会保存到你的 Bangumi 账户。',
        [
          { style: 'cancel', text: '取消' },
          { onPress: () => router.push('/account'), text: '去登录' },
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
      await saveCollection.mutateAsync({
        collectionStatus:
          !currentStatus || currentStatus === 'wish' ? 'doing' : currentStatus,
        rating:
          currentStatus && currentStatus !== 'wish'
            ? personalCollection?.rating
            : undefined,
        watchedEpisodeNumbers,
      });
      playEpisodeToggleHaptic(isWatched);
    } catch (error) {
      Alert.alert(
        '进度没有保存',
        error instanceof Error ? error.message : '请稍后重试。',
      );
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{ title: `第 ${episodeNumber} ${isTrack ? '曲' : '集'}` }}
      />
      <View style={styles.contentView}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          data={replies}
          initialNumToRender={8}
          keyExtractor={(reply) => reply.id}
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          onRefresh={() =>
            void Promise.all([
              catalogQuery.refetch(),
              commentsQuery.refetch(),
              ...(session ? [collectionQuery.refetch()] : []),
            ])
          }
          ref={replyNavigation.listRef}
          refreshing={
            (catalogQuery.isRefetching ||
              commentsQuery.isRefetching ||
              collectionQuery.isRefetching) &&
            !catalogQuery.isPending &&
            !commentsQuery.isPending
          }
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            commentsQuery.isPending || commentsQuery.isError ? null : (
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
                      hitSlop={8}
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
              </View>
              <CatalogStatusBanner
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
              <DiscussionStatus
                isError={commentsQuery.isError}
                isPending={
                  catalogQuery.isPending ||
                  Boolean(catalogEpisode && commentsQuery.isPending)
                }
                onRetry={() => void commentsQuery.refetch()}
              />
            </>
          }
          renderItem={({ index, item }) => (
            <ReplyListItem
              floor={index + 1}
              isHighlighted={item.id === replyNavigation.highlightedReplyId}
              onOpenReference={replyNavigation.openReply}
              onReply={openComposer}
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
        {catalogEpisode ? (
          <DiscussionComposeButton
            accessibilityLabel={session ? '参与讨论' : '登录后参与讨论'}
            disabled={isSigningIn}
            onPress={() => void openComposer()}
          />
        ) : null}
      </View>
      {catalogEpisode ? (
        <DiscussionReplyComposer
          onClose={() => setComposerVisible(false)}
          replyingTo={replyingTo}
          target={{ id: catalogEpisode.id, kind: 'episode' }}
          visible={composerVisible}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  contentView: { flex: 1 },
  list: { flex: 1 },
  content: { padding: 20, paddingBottom: 108 },
  episodeCard: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
  },
  subjectTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  episodeTitle: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 8,
  },
  catalogEpisodeTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    marginTop: 8,
  },
  metaLine: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 14 },
  statusBadge: {
    backgroundColor: '#EFEEE9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  watchedStatusBadge: { backgroundColor: COLORS.accent },
  pressedStatusBadge: { opacity: 0.65 },
  statusText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  watchedStatusText: { color: COLORS.surface },
  airDate: { color: COLORS.subtle, fontSize: 12 },
  description: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 18 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 26,
    paddingHorizontal: 4,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  remoteReplyCount: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  emptyDiscussion: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 20,
  },
  errorRetryText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
