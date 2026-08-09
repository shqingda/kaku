import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
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
import { CommentPreviewSection } from '@/features/subject-detail/comment-preview-section';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { ReviewPreviewSection } from '@/features/subject-detail/review-preview-section';
import { SubjectHero } from '@/features/subject-detail/subject-hero';
import { SubjectOverview } from '@/features/subject-detail/subject-overview';

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
  const { session } = useAuth();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const subjectId = Number(id);
  const catalogQuery = useCatalogSubject(Number(id));
  const collectionQuery = usePersonalCollection(subjectId);
  const saveCollection = useSavePersonalCollection(subjectId);
  const commentsQuery = useSubjectComments(Number(id));
  const reviewsQuery = useSubjectReviews(Number(id));
  const catalogSubject = catalogQuery.data;
  const personalCollection = collectionQuery.data;
  const watchedEpisodeNumbers =
    personalCollection?.watchedEpisodeNumbers ?? [];
  const totalEpisodes = catalogSubject?.totalEpisodes ?? 0;
  const subjectType = catalogSubject?.type ?? 2;
  const tracksWatchProgress = supportsWatchProgress(subjectType);
  const hasEpisodeData = usesEpisodeData(subjectType);
  const detailLabels = getSubjectDetailLabels(subjectType);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  if (catalogQuery.isPending) {
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

  if (!catalogSubject) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingBackButton onPress={goBack} top={insets.top + 8} />
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

  const commentsPage = commentsQuery.data?.pages[0];
  const reviewsPage = reviewsQuery.data?.pages[0];
  const latestComments = commentsPage?.items.slice(0, 5) ?? [];
  const latestReviews = reviewsPage?.items.slice(0, 3) ?? [];
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
    rating: personalCollection?.rating,
    summary,
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SubjectHero coverUrl={coverUrl} title={title} year={year} />
        <View style={styles.heroSpacing} />

        <CatalogStatusBanner
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
              {collectionQuery.error.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void collectionQuery.refetch()}
              style={styles.personalRetry}
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
  heroSpacing: { height: 20 },
  personalState: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  personalStateTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  personalStateText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  personalRetry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  personalRetryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
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
});
