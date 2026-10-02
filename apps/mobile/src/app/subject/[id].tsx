import { SPACING, TYPE } from '@/constants/design';
import { SubjectDetailLinks } from '@/features/subject-detail/subject-detail-links';
import { CommentsPreview, ReviewsPreview } from '@/features/subject-detail/subject-discussion-previews';
import { FloatingBackButton, FloatingHomeButton, FloatingShareButton } from '@/features/subject-detail/subject-floating-actions';
import { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useIsOffline } from '@/lib/use-connectivity';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { userErrorMessage } from '@/lib/user-error-message';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { ExpandableText } from '@/features/shared/expandable-text';
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
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { SkeletonBox } from '@/features/shared/skeleton';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { SubjectHero } from '@/features/subject-detail/subject-hero';
import { SubjectOverview } from '@/features/subject-detail/subject-overview';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

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

export default function SubjectScreen() {
  const styles = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const bannerOffset = isOffline ? SPACING.xxl + SPACING.lg : SPACING.sm;
  const { session } = useAuth();
  const { rememberSubject: rememberRecentSubject } = useRecentSubjects();
  const subjectId = parsePositiveIntegerRouteParam(id);
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
  const reduceMotion = useReduceMotion();

  // 深滚后条目标题随半透明标题条淡入（滚过封面高度即出现），
  // 让深处的页面始终回答「我在看哪个条目」。
  const titleBarFade = useRef(new Animated.Value(0)).current;
  const titleBarVisibleRef = useRef(false);
  const [titleBarVisible, setTitleBarVisible] = useState(false);

  useEffect(() => {
    Animated.timing(titleBarFade, {
      duration: reduceMotion ? 0 : 160,
      easing: Easing.out(Easing.cubic),
      toValue: titleBarVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, titleBarFade, titleBarVisible]);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreviews(true), PREVIEW_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleScroll(event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) {
    const nextTitleBarVisible =
      event.nativeEvent.contentOffset.y > TITLE_BAR_SCROLL_OFFSET;
    if (titleBarVisibleRef.current !== nextTitleBarVisible) {
      titleBarVisibleRef.current = nextTitleBarVisible;
      setTitleBarVisible(nextTitleBarVisible);
    }
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
        {/* 与真实页共用同一滚动容器和顶部内边距：骨架的位置就是
            数据到达后的位置，加载完成不位移，AppleZoom 落点保持稳定。 */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + bannerOffset + SPACING.xs },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.skeleton}>
            <SkeletonBox borderRadius={24} height={238} width={170} />
            <SkeletonBox height={18} width={96} />
            <SkeletonBox height={26} width="62%" />
            <SkeletonBox borderRadius={22} height={132} width="100%" />
            <SkeletonBox borderRadius={22} height={168} width="100%" />
          </View>
        </ScrollView>
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
      <Animated.View
        pointerEvents={titleBarVisible ? 'auto' : 'none'}
        style={[
          styles.titleBar,
          {
            height: insets.top + bannerOffset + 56,
            opacity: titleBarFade,
            paddingTop: insets.top + bannerOffset,
            transform: [
              {
                translateY: titleBarFade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-6, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text numberOfLines={1} style={styles.titleBarText}>
          {title}
        </Text>
      </Animated.View>
      <FloatingShareButton
        path={`/subject/${subjectId}`}
        title={title}
        top={insets.top + bannerOffset}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + bannerOffset + SPACING.xs },
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

        <SubjectDetailLinks subjectId={subjectId} subjectType={subjectType} />

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>简介</Text>
            {summary.length > 100 ? (
              <ExpandableText
                noun="简介"
                style={styles.summary}
                text={summary}
                toggleLabelStyle={styles.summaryToggle}
              />
            ) : (
              <Text style={styles.summary}>{summary}</Text>
            )}
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
  content: { paddingBottom: SPACING.xxl + SPACING.lg, paddingHorizontal: SPACING.lg + SPACING.xs },
  titleBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    // 盖过滚动内容（后置的 ScrollView），又低于三个 zIndex 10 的浮动按钮。
    zIndex: 5,
  },
  titleBarText: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '800',
    height: 56,
    lineHeight: SPACING.xxl + SPACING.xl,
    marginLeft: SPACING.xxl * 2,
    marginRight: SPACING.xxl * 4 - SPACING.xs,
    textAlign: 'center',
  },
  heroSpacing: { height: SPACING.lg + SPACING.xs },
  personalState: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.lg,
    padding: SPACING.lg + SPACING.xs,
  },
  personalStateTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  personalStateText: {
    color: colors.muted,
    ...TYPE.caption,
    lineHeight: TYPE.body.lineHeight,
    marginTop: SPACING.sm,
  },
  personalRetry: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  personalRetryText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.lg,
    padding: SPACING.lg + SPACING.xs,
  },
  panelTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  summary: { color: colors.muted, ...TYPE.body, lineHeight: TYPE.heading.lineHeight, marginTop: SPACING.md },
  summaryToggle: {
    alignSelf: 'flex-start',
    color: colors.accent,
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  pressed: { opacity: 0.62 },
  errorState: { flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  skeleton: {
    alignItems: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  errorTitle: { color: colors.ink, ...TYPE.titleLarge, fontWeight: '700' },
  errorText: { color: colors.muted, ...TYPE.body, lineHeight: TYPE.body.lineHeight, marginTop: SPACING.sm },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: 44,
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  errorRetryText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
});
