import { useCallback, useRef } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
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
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { DiscussionComposer } from '@/features/discussions/discussion-composer';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useBangumiEpisodeComments } from '@/features/discussions/use-bangumi-discussions';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { useWatching } from '@/features/watching/watching-provider';
import { playEpisodeToggleHaptic } from '@/lib/haptics';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '放送时间待定';
}

export default function EpisodeScreen() {
  const { episodeNumber: episodeParam, id } = useLocalSearchParams<{
    episodeNumber: string;
    id: string;
  }>();
  const { items, toggleEpisodeWatched } = useWatching();
  const inputRef = useRef<TextInput>(null);
  const subjectId = Number(id);
  const episodeNumber = Number(episodeParam);
  const catalogQuery = useCatalogSubject(subjectId);
  const subject = items.find((item) => item.id === subjectId);
  const catalogSubject = catalogQuery.data;
  const totalEpisodes =
    catalogSubject?.totalEpisodes ?? subject?.totalEpisodes ?? 0;
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
  const focusComposer = useCallback(() => inputRef.current?.focus(), []);

  if (!subject && catalogQuery.isPending) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: `第 ${episodeNumber} 集` }} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>正在读取章节</Text>
          <Text style={styles.errorText}>正在从 Bangumi 获取章节资料。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isValidEpisode) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '章节不存在' }} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>没有找到这一集</Text>
          <Text style={styles.errorText}>集数可能已经变化，请返回番剧详情页。</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isWatched =
    subject?.watchedEpisodeNumbers.includes(episodeNumber) ?? false;
  const subjectTitle = catalogSubject?.title ?? subject?.title ?? '未知条目';
  const airDate =
    catalogEpisode?.airDate ?? subject?.episodeAirDates[episodeNumber - 1];
  const progressSubject = subject ?? {
    coverUrl: catalogSubject?.coverUrl ?? '',
    episodeAirDates: (catalogSubject?.episodes ?? []).map(
      (episode) => episode.airDate ?? '',
    ),
    id: subjectId,
    summary: catalogSubject?.summary ?? '',
    title: subjectTitle,
    totalEpisodes,
    watchedEpisodeNumbers: [],
    year: catalogSubject?.year ?? 0,
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: `第 ${episodeNumber} 集` }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardView}
      >
        <FlatList
          contentContainerStyle={styles.content}
          data={replies}
          initialNumToRender={8}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(reply) => reply.id}
          maxToRenderPerBatch={8}
          onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
          ref={replyNavigation.listRef}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            commentsQuery.isPending || commentsQuery.isError ? null : (
              <View style={styles.emptyDiscussion}>
                <Text style={styles.emptyTitle}>还没有人讨论这一集</Text>
                <Text style={styles.emptyText}>Bangumi 暂无本集评论。</Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              <View style={styles.episodeCard}>
                <Text style={styles.subjectTitle}>{subjectTitle}</Text>
                <Text style={styles.episodeTitle}>第 {episodeNumber} 集</Text>
                {catalogEpisode?.title ? (
                  <Text style={styles.catalogEpisodeTitle}>
                    {catalogEpisode.title}
                  </Text>
                ) : null}
                <View style={styles.metaLine}>
                  <Pressable
                    accessibilityLabel={
                      isWatched ? '将本集设为未看' : '将本集标记已看'
                    }
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      toggleEpisodeWatched(progressSubject, episodeNumber);
                      playEpisodeToggleHaptic(isWatched);
                    }}
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
                  <Text style={styles.airDate}>{formatAirDate(airDate)} 放送</Text>
                </View>
                <Text style={styles.description}>
                  {catalogEpisode?.description ||
                    '本集简介暂时缺失，稍后可以重试 Bangumi 数据。'}
                </Text>
              </View>
              <CatalogStatusBanner
                isError={catalogQuery.isError}
                isPending={catalogQuery.isPending}
                isRefreshing={catalogQuery.isFetching && !catalogQuery.isPending}
                onRetry={() => void catalogQuery.refetch()}
              />
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>本集讨论</Text>
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
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
});
