import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useIsOffline } from '@/lib/use-connectivity';
import { userErrorMessage } from '@/lib/user-error-message';
import { shareBangumiEntity } from '@/lib/share';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import {
  getSubjectDetailLabels,
  supportsWatchProgress,
  usesEpisodeData,
} from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from '@/features/collections/use-personal-collection';
import {
  useSubjectComments,
  useSubjectReviews,
} from '@/features/reviews/use-subject-reviews';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { HeaderIconButton } from '@/features/shared/header-icon-button';
import { SkeletonBox } from '@/features/shared/skeleton';
import { CommentPreviewSection } from '@/features/subject-detail/comment-preview-section';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { ReviewPreviewSection } from '@/features/subject-detail/review-preview-section';
import { SubjectHero } from '@/features/subject-detail/subject-hero';
import { SubjectOverview } from '@/features/subject-detail/subject-overview';
import { useTheme } from '@/features/theme/theme-provider';
import { prefetchSubjectTopics } from '@/features/discussions/use-bangumi-discussions';
import { prefetchSubjectIndexes } from '@/features/indexes/use-indexes';
import { prefetchSubjectStaff } from '@/features/staff/use-subject-staff';
import {
  prefetchSubjectCharacters,
  prefetchSubjectRelations,
} from '@/features/subject-extras/use-subject-extras';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

function useThemedStyles() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { colors, styles };
}

function DetailEntry({
  hint,
  label,
  onPress,
  onPressIn,
  withBorder = false,
}: {
  hint: string;
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
  withBorder?: boolean;
}) {
  const { colors, styles } = useThemedStyles();
  return (
    <Pressable
      accessibilityLabel={`查看${label}`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.detailEntry,
        withBorder && styles.detailEntryBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.detailEntryCopy}>
        <Text style={styles.detailEntryTitle}>{label}</Text>
        <Text numberOfLines={2} style={styles.detailEntryHint}>{hint}</Text>
      </View>
      <SymbolView
        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
        size={13}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

// 吐槽/评论预览位于长页底部，查询也随之延迟到接近底部才发起；
// 短页面滚动事件可能不触发，2.5s 后兜底挂载。
const PREVIEW_SCROLL_THRESHOLD = 600;
const PREVIEW_FALLBACK_DELAY_MS = 2_500;

function CommentsPreview({
  onOpenMore,
  refreshToken,
  subjectId,
}: {
  onOpenMore: () => void;
  refreshToken: number;
  subjectId: number;
}) {
  const { data, isError, isPending, refetch } = useSubjectComments(subjectId);
  const appliedRefreshToken = useRef(refreshToken);

  useEffect(() => {
    if (refreshToken === appliedRefreshToken.current) return;
    appliedRefreshToken.current = refreshToken;
    void refetch();
  }, [refetch, refreshToken]);

  const page = data?.pages[0];

  return (
    <CommentPreviewSection
      comments={page?.items.slice(0, 5) ?? []}
      isError={isError}
      isPending={isPending}
      onOpenMore={onOpenMore}
      onRetry={() => void refetch()}
      total={page?.total}
    />
  );
}

function ReviewsPreview({
  onOpenMore,
  onOpenReview,
  refreshToken,
  subjectId,
}: {
  onOpenMore: () => void;
  onOpenReview: (review: { id: string }) => void;
  refreshToken: number;
  subjectId: number;
}) {
  const { data, isError, isPending, refetch } = useSubjectReviews(subjectId);
  const appliedRefreshToken = useRef(refreshToken);

  useEffect(() => {
    if (refreshToken === appliedRefreshToken.current) return;
    appliedRefreshToken.current = refreshToken;
    void refetch();
  }, [refetch, refreshToken]);

  const page = data?.pages[0];

  return (
    <ReviewPreviewSection
      isError={isError}
      isPending={isPending}
      onOpenMore={onOpenMore}
      onOpenReview={onOpenReview}
      onRetry={() => void refetch()}
      reviews={page?.items.slice(0, 3) ?? []}
      total={page?.total}
    />
  );
}

function FloatingBackButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  const { styles } = useThemedStyles();
  return (
    <View style={[styles.backButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="返回上一个页面"
        accessibilityLabel="返回"
        icon={{
          android: 'arrow_back',
          ios: 'chevron.left',
          web: 'arrow_back',
        }}
        onPress={onPress}
        variant="floating"
      />
    </View>
  );
}

function FloatingHomeButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  const { styles } = useThemedStyles();
  return (
    <View style={[styles.homeButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="返回 Kaku 首页"
        accessibilityLabel="回到首页"
        icon={{ android: 'home_filled', ios: 'house', web: 'home' }}
        // Same iOS-only optical nudge as HeaderHomeButton.
        iconOffset={Platform.OS === 'ios' ? { y: 0.5 } : undefined}
        onPress={onPress}
        variant="floating"
      />
    </View>
  );
}

function FloatingShareButton({
  path,
  title,
  top,
}: {
  path: string;
  title: string;
  top: number;
}) {
  const { styles } = useThemedStyles();
  return (
    <View style={[styles.shareButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="通过系统分享面板分享这个条目"
        accessibilityLabel="分享条目"
        icon={{ android: 'share', ios: 'square.and.arrow.up', web: 'share' }}
        onPress={() => void shareBangumiEntity({ path, title })}
        variant="floating"
      />
    </View>
  );
}

export default function SubjectScreen() {
  const { colors, styles } = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const bannerOffset = isOffline ? 48 : 8;
  const { session } = useAuth();
  const { rememberSubject: rememberRecentSubject } = useRecentSubjects();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const subjectId = parsePositiveIntegerRouteParam(id);
  const queryClient = useQueryClient();
  const catalogQuery = useCatalogSubject(subjectId ?? 0);
  const collectionQuery = usePersonalCollection(subjectId ?? 0);
  const saveCollection = useSavePersonalCollection(subjectId ?? 0);
  // 底部的吐槽/评论预览延迟挂载，见 CommentsPreview/ReviewsPreview。
  const [showPreviews, setShowPreviews] = useState(false);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const catalogSubject = catalogQuery.data;
  const personalCollection = collectionQuery.data;
  const watchedEpisodeNumbers =
    personalCollection?.watchedEpisodeNumbers ?? [];
  const totalEpisodes = catalogSubject?.totalEpisodes ?? 0;
  const subjectType = catalogSubject?.type ?? 2;
  const tracksWatchProgress = supportsWatchProgress(subjectType);
  const hasEpisodeData = usesEpisodeData(subjectType);
  const detailLabels = getSubjectDetailLabels(subjectType);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreviews(true), PREVIEW_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleScroll(event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) {
    if (showPreviews) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < PREVIEW_SCROLL_THRESHOLD) {
      setShowPreviews(true);
    }
  }

  useEffect(() => {
    if (!catalogSubject) return;

    rememberRecentSubject({
      coverUrl: catalogSubject.coverUrl,
      id: catalogSubject.id,
      title: catalogSubject.title,
      type: catalogSubject.type,
      viewedAt: Date.now(),
    });
  }, [catalogSubject, rememberRecentSubject]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  if (!subjectId) {
    return <InvalidRouteState message="这个条目链接缺少有效编号。" />;
  }

  if (catalogQuery.isPending) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingBackButton onPress={goBack} top={insets.top + bannerOffset} />
        <FloatingHomeButton
          onPress={() => router.dismissTo('/')}
          top={insets.top + bannerOffset}
        />
        {/* 骨架与真实布局同构：封面、年份、标题、收藏盒、简介，数据到达时不跳版。 */}
        <View style={styles.skeleton}>
          <SkeletonBox borderRadius={24} height={238} width={170} />
          <SkeletonBox height={18} width={96} />
          <SkeletonBox height={26} width="62%" />
          <SkeletonBox borderRadius={22} height={132} width="100%" />
          <SkeletonBox borderRadius={22} height={168} width="100%" />
        </View>
      </View>
    );
  }

  if (!catalogSubject) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingBackButton onPress={goBack} top={insets.top + bannerOffset} />
        <FloatingHomeButton
          onPress={() => router.dismissTo('/')}
          top={insets.top + bannerOffset}
        />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>条目读取失败</Text>
          <Text style={styles.errorText}>请检查网络后重试。</Text>
          <Pressable
            accessibilityLabel="重新读取条目"
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
      </View>
    );
  }

  const title = catalogSubject.title;
  const coverUrl = catalogSubject.coverUrl;
  const summary = catalogSubject.summary || '暂无简介';
  const year = catalogSubject.year;
  const progressSubject = {
    collectionStatus: personalCollection?.collectionStatus ?? null,
    comment: session ? personalCollection?.comment ?? '' : undefined,
    coverUrl: coverUrl ?? '',
    episodeAirDates: catalogSubject.episodes.map(
      (episode) => episode.airDate ?? '',
    ),
    id: subjectId,
    isPrivate: session ? personalCollection?.isPrivate ?? false : undefined,
    readChapterCount:
      session && catalogSubject.type === 1
        ? personalCollection?.readChapterCount ?? 0
        : undefined,
    readVolumeCount:
      session && catalogSubject.type === 1
        ? personalCollection?.readVolumeCount ?? 0
        : undefined,
    rating: personalCollection?.rating,
    summary,
    tags: session ? personalCollection?.tags ?? [] : undefined,
    title,
    totalEpisodes,
    type: catalogSubject.type,
    watchedEpisodeNumbers,
    year: year ?? 0,
  };
  function openEpisode(episodeNumber: number) {
    router.push({
      pathname: '/subject/[id]/episode/[episodeNumber]',
      params: { id: String(subjectId), episodeNumber: String(episodeNumber) },
    });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FloatingShareButton
        path={`/subject/${subjectId}`}
        title={title}
        top={insets.top + bannerOffset}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + bannerOffset + 4 },
        ]}
        onScroll={handleScroll}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => {
              void Promise.all([
                catalogQuery.refetch(),
                ...(session ? [collectionQuery.refetch()] : []),
              ]);
              setPreviewRefreshToken((token) => token + 1);
            }}
            refreshing={
              (catalogQuery.isRefetching || collectionQuery.isRefetching) &&
              !catalogQuery.isPending
            }
          />
        }
        scrollEventThrottle={48}
        showsVerticalScrollIndicator={false}
      >
        <SubjectHero coverUrl={coverUrl} title={title} year={year} />
        <View style={styles.heroSpacing} />

        <CatalogStatusBanner
          fromOfflinePack={catalogSubject?.offlineSource === 'pack'}
          isError={catalogQuery.isError}
          isPending={catalogQuery.isPending}
          isRefreshing={catalogQuery.isFetching && !catalogQuery.isPending}
          onRetry={() => void catalogQuery.refetch()}
        />

        {session && collectionQuery.isPending ? (
          <View style={styles.personalState}>
            <Text style={styles.personalStateTitle}>正在读取收藏盒</Text>
            <Text style={styles.personalStateText}>
              正在同步 Bangumi 收藏、进度和评分。
            </Text>
          </View>
        ) : session && collectionQuery.isError ? (
          <View style={styles.personalState}>
            <Text style={styles.personalStateTitle}>收藏盒同步失败</Text>
            <Text style={styles.personalStateText}>
              {userErrorMessage(collectionQuery.error)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void collectionQuery.refetch()}
              style={({ pressed }) => [
                styles.personalRetry,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.personalRetryText}>重试</Text>
            </Pressable>
          </View>
        ) : (
          <CollectionControls
            item={progressSubject}
            onSave={(update) => saveCollection.mutateAsync(update).then(() => undefined)}
          />
        )}

        <SubjectOverview
          subject={catalogSubject}
          title={title}
          totalEpisodes={totalEpisodes}
          year={year}
          showsEpisodes={tracksWatchProgress && totalEpisodes > 0}
        />

          <View style={styles.detailEntries}>
            {detailLabels.characters ? (
              <DetailEntry
                hint={detailLabels.characters.hint}
                label={detailLabels.characters.label}
                onPress={() =>
                  router.push({
                    pathname: '/subject/[id]/characters',
                    params: { id: String(subjectId) },
                  })
                }
                onPressIn={() =>
                  prefetchSubjectCharacters(queryClient, subjectId)
                }
              />
            ) : null}
            <DetailEntry
              hint={detailLabels.credits.hint}
              label={detailLabels.credits.label}
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/staff',
                  params: { id: String(subjectId) },
                })
              }
              onPressIn={() => prefetchSubjectStaff(queryClient, subjectId)}
              withBorder={Boolean(detailLabels.characters)}
            />
            <DetailEntry
              hint="系列作品与相关条目"
              label="关联条目"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]/relations',
                  params: { id: String(subjectId) },
                })
              }
              onPressIn={() =>
                prefetchSubjectRelations(queryClient, subjectId)
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
              onPressIn={() => prefetchSubjectTopics(queryClient, subjectId)}
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
              onPressIn={() => prefetchSubjectIndexes(queryClient, subjectId)}
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

        {hasEpisodeData && totalEpisodes > 0 ? (
          <EpisodeSection
            episodes={catalogSubject?.episodes ?? []}
            fallbackAirDates={progressSubject.episodeAirDates}
            key={subjectId}
            kind={subjectType === 3 ? 'track' : 'episode'}
            onOpenEpisode={openEpisode}
            totalEpisodes={totalEpisodes}
            tracksWatchProgress={tracksWatchProgress}
            watchedEpisodeNumbers={watchedEpisodeNumbers}
          />
        ) : null}

        {showPreviews ? (
          <CommentsPreview
            onOpenMore={() =>
              router.push({
                pathname: '/subject/[id]/comments',
                params: { id: String(subjectId) },
              })
            }
            refreshToken={previewRefreshToken}
            subjectId={subjectId}
          />
        ) : null}

        {showPreviews ? (
          <ReviewsPreview
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
            refreshToken={previewRefreshToken}
            subjectId={subjectId}
          />
        ) : null}
      </ScrollView>
      <FloatingBackButton onPress={goBack} top={insets.top + bannerOffset} />
      <FloatingHomeButton
        onPress={() => router.dismissTo('/')}
        top={insets.top + bannerOffset}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  backButton: {
    left: 16,
    position: 'absolute',
    zIndex: 10,
  },
  homeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  shareButton: {
    position: 'absolute',
    right: 68,
    zIndex: 10,
  },
  heroSpacing: { height: 20 },
  personalState: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  personalStateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  personalStateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  personalRetry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  personalRetryText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  detailEntries: {
    backgroundColor: colors.surface,
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
  detailEntryCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  detailEntryBorder: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailEntryTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  detailEntryHint: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  panelTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  summary: { color: colors.muted, fontSize: 15, lineHeight: 24, marginTop: 10 },
  summaryToggle: {
    alignSelf: 'flex-start',
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 9,
  },
  pressed: { opacity: 0.62 },
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  skeleton: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorTitle: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 20,
  },
  errorRetryText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
});
