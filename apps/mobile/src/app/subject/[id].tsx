import { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import {
  useSubjectComments,
  useSubjectReviews,
} from '@/features/reviews/use-subject-reviews';
import { CommentPreviewSection } from '@/features/subject-detail/comment-preview-section';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { ReviewPreviewSection } from '@/features/subject-detail/review-preview-section';
import { SubjectHero } from '@/features/subject-detail/subject-hero';
import { SubjectOverview } from '@/features/subject-detail/subject-overview';
import { useWatching } from '@/features/watching/watching-provider';
import { playEpisodeToggleHaptic } from '@/lib/haptics';

function DetailEntry({
  hint,
  label,
  onPress,
  withBorder = false,
}: {
  hint: string;
  label: string;
  onPress: () => void;
  withBorder?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`查看${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.detailEntry,
        withBorder && styles.detailEntryBorder,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Text style={styles.detailEntryTitle}>{label}</Text>
        <Text style={styles.detailEntryHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function FloatingBackButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  return (
    <Pressable
      accessibilityLabel="返回"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        { top },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{
          android: 'arrow_back',
          ios: 'chevron.left',
          web: 'arrow_back',
        }}
        size={19}
        tintColor={COLORS.ink}
        weight="semibold"
      />
    </Pressable>
  );
}

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    setCollectionStatus,
    setRating,
    setWatchedEpisodeCount,
  } = useWatching();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [progressDraft, setProgressDraft] = useState('');
  const progressDraftRef = useRef('');
  const isProgressEditActiveRef = useRef(false);
  const didShowProgressKeyboardRef = useRef(false);
  const subjectId = Number(id);
  const subject = items.find((item) => item.id === Number(id));
  const catalogQuery = useCatalogSubject(Number(id));
  const commentsQuery = useSubjectComments(Number(id));
  const reviewsQuery = useSubjectReviews(Number(id));
  const catalogSubject = catalogQuery.data;
  const watchedEpisodeNumbers = subject?.watchedEpisodeNumbers ?? [];
  const totalEpisodes =
    catalogSubject?.totalEpisodes ?? subject?.totalEpisodes ?? 0;
  // Older cached catalog entries may not have `type` yet. An episode count is
  // also a reliable signal here and keeps "0 / N 集" visible immediately.
  const isAnime =
    catalogSubject?.type === 2 || Boolean(subject) || totalEpisodes > 0;

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (isProgressEditActiveRef.current) {
        didShowProgressKeyboardRef.current = true;
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      if (didShowProgressKeyboardRef.current) {
        saveProgress();
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [subjectId, totalEpisodes, watchedEpisodeNumbers.length]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  if (!subject && catalogQuery.isPending) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingBackButton onPress={goBack} top={insets.top + 8} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>正在读取条目</Text>
          <Text style={styles.errorText}>正在从 Bangumi 获取公开资料。</Text>
        </View>
      </View>
    );
  }

  if (!subject && !catalogQuery.data) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingBackButton onPress={goBack} top={insets.top + 8} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>条目读取失败</Text>
          <Text style={styles.errorText}>请检查网络后返回重试。</Text>
        </View>
      </View>
    );
  }

  const commentsPage = commentsQuery.data?.pages[0];
  const reviewsPage = reviewsQuery.data?.pages[0];
  const latestComments = commentsPage?.items.slice(0, 5) ?? [];
  const latestReviews = reviewsPage?.items.slice(0, 3) ?? [];
  const title = catalogSubject?.title ?? subject?.title ?? '未知条目';
  const coverUrl = catalogSubject?.coverUrl ?? subject?.coverUrl;
  const summary = catalogSubject?.summary ?? subject?.summary ?? '暂无简介';
  const year = catalogSubject?.year ?? subject?.year;
  const progressSubject = subject ?? {
    collectionStatus: null,
    coverUrl: coverUrl ?? '',
    episodeAirDates: (catalogSubject?.episodes ?? []).map(
      (episode) => episode.airDate ?? '',
    ),
    id: subjectId,
    summary,
    title,
    totalEpisodes,
    watchedEpisodeNumbers: [],
    year: year ?? 0,
  };
  function openEpisode(episodeNumber: number) {
    router.push({
      pathname: '/subject/[id]/episode/[episodeNumber]',
      params: { id: String(subjectId), episodeNumber: String(episodeNumber) },
    });
  }

  function startEditingProgress() {
    const currentCount = String(watchedEpisodeNumbers.length);
    progressDraftRef.current = currentCount;
    isProgressEditActiveRef.current = true;
    didShowProgressKeyboardRef.current = false;
    setProgressDraft(currentCount);
    setIsEditingProgress(true);
  }

  function saveProgress() {
    if (!isProgressEditActiveRef.current) {
      return;
    }

    isProgressEditActiveRef.current = false;
    didShowProgressKeyboardRef.current = false;
    const draft = progressDraftRef.current;
    const nextCount = Number(draft);

    if (draft !== '' && Number.isInteger(nextCount)) {
      setWatchedEpisodeCount(progressSubject, nextCount);
      playEpisodeToggleHaptic(nextCount < watchedEpisodeNumbers.length);
    }

    setIsEditingProgress(false);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="never"
        onScrollBeginDrag={Keyboard.dismiss}
        onTouchEnd={isEditingProgress ? saveProgress : undefined}
        showsVerticalScrollIndicator={false}
      >
        <SubjectHero coverUrl={coverUrl} title={title} year={year} />
        {isAnime && isEditingProgress ? (
          <View
            onTouchEnd={(event) => event.stopPropagation()}
            style={[styles.heroProgress, styles.editingHeroProgress]}
          >
            <TextInput
              accessibilityLabel="观看进度"
              autoFocus
              keyboardType="number-pad"
              maxLength={String(totalEpisodes).length}
              onChangeText={(value) => {
                const nextValue = value.replace(/\D/g, '');
                progressDraftRef.current = nextValue;
                setProgressDraft(nextValue);
              }}
              onEndEditing={saveProgress}
              selectTextOnFocus
              style={styles.heroProgressInput}
              value={progressDraft}
            />
            <Text style={styles.heroProgressLabel}>/ {totalEpisodes} 集</Text>
          </View>
        ) : isAnime ? (
          <Pressable
            accessibilityLabel={`观看进度 ${watchedEpisodeNumbers.length} 集，共 ${totalEpisodes} 集，点击编辑`}
            accessibilityRole="button"
            onPress={startEditingProgress}
            style={({ pressed }) => [
              styles.heroProgress,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.heroProgressValue}>
              {watchedEpisodeNumbers.length}
            </Text>
            <Text style={styles.heroProgressLabel}>/ {totalEpisodes} 集</Text>
          </Pressable>
        ) : (
          <View style={styles.heroSpacing} />
        )}

        <CatalogStatusBanner
          isError={catalogQuery.isError}
          isPending={catalogQuery.isPending}
          isRefreshing={catalogQuery.isFetching && !catalogQuery.isPending}
          onRetry={() => void catalogQuery.refetch()}
        />

        <CollectionControls
          item={progressSubject}
          onChangeRating={(rating) => setRating(progressSubject, rating)}
          onChangeStatus={(status) =>
            setCollectionStatus(progressSubject, status)
          }
        />

        <SubjectOverview
          subject={catalogSubject}
          title={title}
          totalEpisodes={totalEpisodes}
          year={year}
          isAnime={isAnime}
        />

          <View style={styles.detailEntries}>
            <DetailEntry
              hint="角色介绍与配音阵容"
              label="角色与声优"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/characters',
                  params: { id: String(subjectId) },
                })
              }
            />
            <DetailEntry
              hint="完整职位与参与集数"
              label="制作人员"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/staff',
                  params: { id: String(subjectId) },
                })
              }
              withBorder
            />
            <DetailEntry
              hint="系列作品、原声与主题曲"
              label="关联条目"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/relations',
                  params: { id: String(subjectId) },
                })
              }
              withBorder
            />
            <DetailEntry
              hint="条目相关话题与回复"
              label="讨论版"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/discussions',
                  params: { id: String(subjectId) },
                })
              }
              withBorder
            />
            <DetailEntry
              hint="收录该条目的公开主题目录"
              label="目录"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/indexes',
                  params: { id: String(subjectId) },
                })
              }
              withBorder
            />
            <DetailEntry
              hint="评分分布、收藏与基础信息"
              label="条目资料"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/info',
                  params: { id: String(subjectId) },
                })
              }
              withBorder
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>简介</Text>
            <Text
              numberOfLines={isSummaryExpanded ? undefined : 3}
              style={styles.summary}
            >
              {summary}
            </Text>
            {summary.length > 100 ? (
              <Pressable
                accessibilityLabel={isSummaryExpanded ? '收起简介' : '展开简介'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setIsSummaryExpanded((current) => !current)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.summaryToggle}>
                  {isSummaryExpanded ? '收起' : '展开'}
                </Text>
              </Pressable>
            ) : null}
          </View>

        {isAnime ? (
          <EpisodeSection
            episodes={catalogSubject?.episodes ?? []}
            fallbackAirDates={subject?.episodeAirDates ?? []}
            onOpenEpisode={openEpisode}
            totalEpisodes={totalEpisodes}
            watchedEpisodeNumbers={watchedEpisodeNumbers}
          />
        ) : null}

        <CommentPreviewSection
          comments={latestComments}
          isError={commentsQuery.isError}
          isPending={commentsQuery.isPending}
          onOpenMore={() =>
            router.push({
              pathname: '/subject/[id]/comments',
              params: { id: String(subjectId) },
            })
          }
          onRetry={() => void commentsQuery.refetch()}
          total={commentsPage?.total}
        />

        <ReviewPreviewSection
          isError={reviewsQuery.isError}
          isPending={reviewsQuery.isPending}
          onOpenMore={() =>
            router.push({
              pathname: '/subject/[id]/reviews',
              params: { id: String(subjectId) },
            })
          }
          onOpenReview={(review) =>
            router.push({
              pathname: '/subject/[id]/review/[reviewId]',
              params: {
                id: String(subjectId),
                reviewId: review.id,
              },
            })
          }
          onRetry={() => void reviewsQuery.refetch()}
          reviews={latestReviews}
          total={reviewsPage?.total}
        />
      </ScrollView>
      <FloatingBackButton onPress={goBack} top={insets.top + 8} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(29, 29, 31, 0.06)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: 'center',
    left: 16,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 40,
    zIndex: 10,
  },
  heroProgress: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    alignSelf: 'center',
    flexDirection: 'row',
    height: 42,
    marginBottom: 28,
    marginTop: 14,
    paddingHorizontal: 14,
  },
  editingHeroProgress: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
  },
  heroProgressLabel: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  heroProgressValue: {
    color: COLORS.accent,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginRight: 6,
  },
  heroProgressInput: {
    color: COLORS.accent,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginRight: 6,
    minWidth: 24,
    padding: 0,
    textAlign: 'center',
  },
  heroSpacing: { height: 28 },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  detailEntries: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  detailEntry: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  detailEntryBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailEntryTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  detailEntryHint: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  panelTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  summary: { color: COLORS.muted, fontSize: 15, lineHeight: 24, marginTop: 10 },
  summaryToggle: {
    alignSelf: 'flex-start',
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 9,
  },
  chevron: { color: COLORS.subtle, fontSize: 25, fontWeight: '300' },
  pressed: { opacity: 0.62 },
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
});
