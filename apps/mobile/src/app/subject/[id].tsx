import { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import {
  supportsWatchProgress,
  usesEpisodeData,
} from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from '@/features/collections/use-personal-collection';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { PersonalCollectionPanel } from '@/features/subject-detail/personal-collection-panel';
import { toProgressSubject } from '@/features/subject-detail/progress-subject';
import { SubjectDetailLinks } from '@/features/subject-detail/subject-detail-links';
import { CommentsPreview, ReviewsPreview } from '@/features/subject-detail/subject-discussion-previews';
import { FloatingBackButton, FloatingHomeButton, FloatingShareButton } from '@/features/subject-detail/subject-floating-actions';
import { SubjectHero } from '@/features/subject-detail/subject-hero';
import { SubjectOverview } from '@/features/subject-detail/subject-overview';
import { SubjectDetailSkeleton, SubjectLoadError } from '@/features/subject-detail/subject-screen-states';
import { SubjectSummaryPanel } from '@/features/subject-detail/subject-summary-panel';
import { SubjectTitleBar } from '@/features/subject-detail/subject-title-bar';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';
import { useIsOffline } from '@/lib/use-connectivity';

function useThemedStyles() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return styles;
}

// 吐槽/评论预览位于长页底部，查询也随之延迟到接近底部才发起；
// 短页面滚动事件可能不触发，2.5s 后兜底挂载。
const PREVIEW_SCROLL_THRESHOLD = 600;
const PREVIEW_FALLBACK_DELAY_MS = 2_500;
// 滚过封面区（顶部内边距 + 238pt 封面 + 间距）后浮现标题条。
const TITLE_BAR_SCROLL_OFFSET = 320;

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  };
};

export default function SubjectScreen() {
  const styles = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const bannerOffset = isOffline ? SPACING.xxl + SPACING.lg : SPACING.sm;
  const chromeTop = insets.top + bannerOffset;
  const { session } = useAuth();
  const { rememberSubject: rememberRecentSubject } = useRecentSubjects();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const catalogQuery = useCatalogSubject(subjectId ?? 0);
  const collectionQuery = usePersonalCollection(subjectId ?? 0);
  const saveCollection = useSavePersonalCollection(subjectId ?? 0);
  // 底部的吐槽/评论预览延迟挂载，见 CommentsPreview/ReviewsPreview。
  const [showPreviews, setShowPreviews] = useState(false);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const titleBarVisibleRef = useRef(false);
  const [titleBarVisible, setTitleBarVisible] = useState(false);
  const catalogSubject = catalogQuery.data;

  useEffect(() => {
    const timer = setTimeout(() => setShowPreviews(true), PREVIEW_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!catalogSubject) return;

    rememberRecentSubject({
      coverUrl: catalogSubject.thumbnailUrl ?? catalogSubject.coverUrl,
      id: catalogSubject.id,
      title: catalogSubject.title,
      type: catalogSubject.type,
      viewedAt: Date.now(),
    });
  }, [catalogSubject, rememberRecentSubject]);

  function handleScroll(event: ScrollEvent) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nextTitleBarVisible = contentOffset.y > TITLE_BAR_SCROLL_OFFSET;
    if (titleBarVisibleRef.current !== nextTitleBarVisible) {
      titleBarVisibleRef.current = nextTitleBarVisible;
      setTitleBarVisible(nextTitleBarVisible);
    }
    if (showPreviews) return;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < PREVIEW_SCROLL_THRESHOLD) {
      setShowPreviews(true);
    }
  }

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

  const floatingNavigation = (
    <>
      <FloatingBackButton onPress={goBack} top={chromeTop} />
      <FloatingHomeButton onPress={() => router.dismissTo('/')} top={chromeTop} />
    </>
  );
  const contentStyle = [styles.content, { paddingTop: chromeTop + SPACING.xs }];

  if (catalogQuery.isPending) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {floatingNavigation}
        <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          <SubjectDetailSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!catalogSubject) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {floatingNavigation}
        <SubjectLoadError onRetry={() => void catalogQuery.refetch()} />
      </View>
    );
  }

  const { title, totalEpisodes, type: subjectType, year } = catalogSubject;
  const tracksWatchProgress = supportsWatchProgress(subjectType);
  const progressSubject = toProgressSubject(catalogSubject, collectionQuery.data, {
    collectionLoaded: collectionQuery.isSuccess,
    signedIn: Boolean(session),
    subjectId,
  });

  function openEpisode(episodeNumber: number) {
    router.push({
      pathname: '/subject/[id]/episode/[episodeNumber]',
      params: { id: String(subjectId), episodeNumber: String(episodeNumber) },
    });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SubjectTitleBar title={title} top={chromeTop} visible={titleBarVisible} />
      <FloatingShareButton path={`/subject/${subjectId}`} title={title} top={chromeTop} />
      <ScrollView
        contentContainerStyle={contentStyle}
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
        <SubjectHero
          coverUrl={catalogSubject.coverUrl}
          thumbnailUrl={catalogSubject.thumbnailUrl}
          title={title}
          year={year}
        />
        <View style={styles.heroSpacing} />

        <CatalogStatusBanner
          fromOfflinePack={catalogSubject.offlineSource === 'pack'}
          isError={catalogQuery.isError}
          isPending={catalogQuery.isPending}
          isRefreshing={catalogQuery.isFetching && !catalogQuery.isPending}
          onRetry={() => void catalogQuery.refetch()}
        />

        <PersonalCollectionPanel
          error={collectionQuery.error}
          isError={collectionQuery.isError}
          isPending={collectionQuery.isPending}
          item={progressSubject}
          onRetry={() => void collectionQuery.refetch()}
          onSave={(update) => saveCollection.mutateAsync(update).then(() => undefined)}
          signedIn={Boolean(session)}
        />

        <SubjectOverview
          subject={catalogSubject}
          title={title}
          totalEpisodes={totalEpisodes}
          year={year}
          showsEpisodes={tracksWatchProgress && totalEpisodes > 0}
        />

        <SubjectDetailLinks subjectId={subjectId} subjectType={subjectType} />

        <SubjectSummaryPanel summary={progressSubject.summary} />

        {usesEpisodeData(subjectType) && totalEpisodes > 0 ? (
          <EpisodeSection
            episodes={catalogSubject.episodes}
            fallbackAirDates={progressSubject.episodeAirDates}
            key={subjectId}
            kind={subjectType === 3 ? 'track' : 'episode'}
            onOpenEpisode={openEpisode}
            totalEpisodes={totalEpisodes}
            tracksWatchProgress={tracksWatchProgress}
            watchedEpisodeNumbers={progressSubject.watchedEpisodeNumbers}
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
      {floatingNavigation}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: SPACING.xxl + SPACING.lg, paddingHorizontal: SPACING.lg + SPACING.xs },
  heroSpacing: { height: SPACING.lg + SPACING.xs },
});
