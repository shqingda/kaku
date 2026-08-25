import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import {
  buildCollectionOverview,
  buildCollectionOverviewJson,
  buildCollectionOverviewShareText,
  buildCollectionStatusAnalysis,
} from '@/features/collections/collection-overview-model';
import { HorizontalBarChart } from '@/features/insights/horizontal-bar-chart';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { usePublicUserCollections } from '@/features/users/use-public-user';
import type { CollectionStatus } from '@/features/watching/model';

const COLLECTION_TYPES = [2, 1, 3, 4, 6] as const;
const COLLECTION_STATUSES: CollectionStatus[] = [
  'completed',
  'doing',
  'wish',
  'onHold',
  'dropped',
];

export default function CollectionOverviewScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedSubjectType, setSelectedSubjectType] = useState(2);
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';
  const animeQuery = usePublicUserCollections(username, 2);
  const bookQuery = usePublicUserCollections(username, 1);
  const musicQuery = usePublicUserCollections(username, 3);
  const gameQuery = usePublicUserCollections(username, 4);
  const realQuery = usePublicUserCollections(username, 6);
  const completedQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    'completed',
  );
  const doingQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    'doing',
  );
  const wishQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    'wish',
  );
  const onHoldQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    'onHold',
  );
  const droppedQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    'dropped',
  );
  const typeQueries = [
    animeQuery,
    bookQuery,
    musicQuery,
    gameQuery,
    realQuery,
  ];
  const statusQueries = [
    completedQuery,
    doingQuery,
    wishQuery,
    onHoldQuery,
    droppedQuery,
  ];
  const allQueries = [...typeQueries, ...statusQueries];
  const isPending = typeQueries.some((query) => query.isPending);
  const hasError = typeQueries.some((query) => query.isError);
  const hasCompleteData = typeQueries.every(
    (query) => query.data?.pages[0]?.total !== undefined,
  );
  const hasCompleteStatusData = statusQueries.every(
    (query) => query.data?.pages[0]?.total !== undefined,
  );
  const hasStatusError = statusQueries.some((query) => query.isError);
  const isStatusPending = statusQueries.some((query) => query.isPending);
  const isRefreshing = allQueries.some(
    (query) => query.isRefetching && !query.isPending,
  );
  const overview = buildCollectionOverview(
    COLLECTION_TYPES.map((subjectType, index) => ({
      subjectType,
      total: typeQueries[index].data?.pages[0]?.total ?? 0,
    })),
  );
  const statusAnalysis = buildCollectionStatusAnalysis(
    selectedSubjectType,
    COLLECTION_STATUSES.map((status, index) => ({
      status,
      total: statusQueries[index].data?.pages[0]?.total ?? 0,
    })),
  );
  const selectedSubjectTypeLabel = getSubjectTypeLabel(selectedSubjectType);

  function refresh() {
    void Promise.all(allQueries.map((query) => query.refetch()));
  }

  function retryStatusAnalysis() {
    void Promise.all(statusQueries.map((query) => query.refetch()));
  }

  async function shareOverview(format: 'json' | 'text') {
    setIsSharing(true);
    try {
      await Share.share({
        message:
          format === 'json'
            ? buildCollectionOverviewJson(overview, username)
            : buildCollectionOverviewShareText(overview, username),
        title: format === 'json' ? 'Kaku 收藏分析 JSON' : 'Kaku 收藏分析',
      });
    } catch {
      Alert.alert('暂时无法分享', '系统分享面板没有打开，请稍后重试。');
    } finally {
      setIsSharing(false);
    }
  }

  if (isAuthLoading) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState text="正在读取账户信息。" title="准备收藏分析" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState
            action={() => router.push('/account')}
            actionLabel="前往登录"
            text="连接 Bangumi 后，Kaku 才能读取你的公开收藏总数。"
            title="需要登录"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isPending && !hasCompleteData) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState text="正在汇总五类公开收藏。" title="生成收藏分析" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompleteData) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState
            action={refresh}
            text="部分收藏没有读取成功，请检查网络后重试。已有缓存不会被清除。"
            title="分析暂不完整"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={refresh}
            progressBackgroundColor={colors.surface}
            refreshing={isRefreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>KAKU COLLECTIONS</Text>
        <Text accessibilityRole="header" style={styles.title}>
          你的收藏分析
        </Text>
        <Text style={styles.description}>
          看清收藏构成、进行中和待开始。只读取公开总数，不下载完整列表。
        </Text>

        {hasError ? (
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={({ pressed }) => [
              styles.warning,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.warningText}>
              刷新失败，当前展示上次缓存 · 点此重试
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.totalCard}>
          <Text maxFontSizeMultiplier={1.2} style={styles.totalValue}>
            {overview.total.toLocaleString('zh-CN')}
          </Text>
          <Text style={styles.totalLabel}>全部公开收藏</Text>
          <Text style={styles.totalMeta}>@{username} · 五种媒体类型</Text>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>类型分布</Text>
          <Text style={styles.cardDescription}>全部公开收藏中的媒体类型占比</Text>
          <HorizontalBarChart
            denominator={overview.total}
            items={overview.items.map((item) => ({
              id: item.subjectType,
              label: item.label,
              value: item.total,
            }))}
            onItemPress={(item) =>
                router.push({
                  pathname: '/user/collections/[username]',
                  params: {
                    type: String(item.id),
                    username,
                  },
                })
            }
          />
        </View>

        <View style={styles.analysisCard}>
          <Text style={styles.cardTitle}>收藏状态</Text>
          <Text style={styles.cardDescription}>
            切换类型，查看完成、进行中和待开始的分布
          </Text>
          <SubjectTypeTabs
            contentContainerStyle={styles.statusTabs}
            onChange={setSelectedSubjectType}
            selectedType={selectedSubjectType}
          />

          {isStatusPending && !hasCompleteStatusData ? (
            <View style={styles.inlineState}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.inlineStateText}>
                正在读取{selectedSubjectTypeLabel}收藏状态…
              </Text>
            </View>
          ) : !hasCompleteStatusData ? (
            <Pressable
              accessibilityRole="button"
              onPress={retryStatusAnalysis}
              style={({ pressed }) => [
                styles.statusError,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.warningText}>
                状态数据暂时不完整 · 点此重试
              </Text>
            </Pressable>
          ) : (
            <>
              {hasStatusError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={retryStatusAnalysis}
                  style={({ pressed }) => [
                    styles.statusError,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.warningText}>
                    刷新失败，当前展示上次缓存 · 点此重试
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.progressMetrics}>
                <ProgressMetric
                  detail="已开始条目"
                  label="完成率"
                  styles={styles}
                  value={`${statusAnalysis.completionRate.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}%`}
                />
                <ProgressMetric
                  detail={selectedSubjectTypeLabel}
                  label="进行中"
                  styles={styles}
                  value={statusAnalysis.active.toLocaleString('zh-CN')}
                />
                <ProgressMetric
                  detail="愿望与搁置"
                  label="待开始"
                  styles={styles}
                  value={statusAnalysis.backlog.toLocaleString('zh-CN')}
                />
              </View>
              <HorizontalBarChart
                denominator={statusAnalysis.total}
                items={statusAnalysis.items.map((item) => ({
                  id: item.status,
                  label: item.label,
                  value: item.total,
                }))}
                onItemPress={(item) =>
                  router.push({
                    pathname: '/user/collections/[username]',
                    params: {
                      status: String(item.id),
                      type: String(selectedSubjectType),
                      username,
                    },
                  })
                }
              />
            </>
          )}
        </View>

        <View style={styles.exportCard}>
          <Text style={styles.cardTitle}>导出与分享</Text>
          <Text style={styles.exportDescription}>
            只包含上方五类总数，不包含收藏条目、备注或私密数据。
          </Text>
          <View style={styles.exportActions}>
            <Pressable
              accessibilityLabel="分享收藏分析摘要"
              accessibilityRole="button"
              disabled={isSharing}
              onPress={() => void shareOverview('text')}
              style={({ pressed }) => [
                styles.exportPrimary,
                (pressed || isSharing) && styles.pressed,
              ]}
            >
              <Text style={styles.exportPrimaryText}>分享摘要</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="导出收藏分析 JSON"
              accessibilityRole="button"
              disabled={isSharing}
              onPress={() => void shareOverview('json')}
              style={({ pressed }) => [
                styles.exportSecondary,
                (pressed || isSharing) && styles.pressed,
              ]}
            >
              <Text style={styles.exportSecondaryText}>导出 JSON</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footnote}>
          收藏可见性由 Bangumi 决定。下拉可重新读取；点击图表条目可查看对应列表。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressMetric({
  detail,
  label,
  styles,
  value,
}: {
  detail: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.progressMetric}>
      <Text maxFontSizeMultiplier={1.2} selectable style={styles.progressValue}>
        {value}
      </Text>
      <Text style={styles.progressLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.progressDetail}>{detail}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    stateContainer: { flex: 1, justifyContent: 'center', padding: 24 },
    content: { padding: 24, paddingBottom: 40 },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    title: {
      color: colors.ink,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.7,
      lineHeight: 34,
      marginTop: 8,
    },
    description: {
      color: colors.subtle,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 10,
      maxWidth: 350,
    },
    warning: {
      backgroundColor: colors.accentSoft,
      borderRadius: 14,
      marginTop: 20,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    warningText: {
      color: colors.accentRich,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    totalCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 24,
      marginTop: 28,
      minHeight: 180,
      padding: 22,
    },
    totalValue: {
      color: colors.ink,
      fontSize: 50,
      fontWeight: '900',
      letterSpacing: -1.8,
      lineHeight: 58,
    },
    totalLabel: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 8,
    },
    totalMeta: { color: colors.subtle, fontSize: 12, marginTop: 6 },
    breakdownCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 24,
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    cardTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 6,
    },
    cardDescription: {
      color: colors.subtle,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 4,
    },
    analysisCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 24,
      marginTop: 12,
      padding: 20,
    },
    statusTabs: { paddingVertical: 14 },
    inlineState: {
      alignItems: 'center',
      gap: 10,
      justifyContent: 'center',
      minHeight: 150,
    },
    inlineStateText: { color: colors.subtle, fontSize: 12 },
    statusError: {
      backgroundColor: colors.accentSoft,
      borderCurve: 'continuous',
      borderRadius: 14,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    progressMetrics: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    progressMetric: {
      backgroundColor: colors.background,
      borderCurve: 'continuous',
      borderRadius: 16,
      flex: 1,
      minHeight: 104,
      padding: 12,
    },
    progressValue: {
      color: colors.ink,
      fontSize: 24,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    progressLabel: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 7,
    },
    progressDetail: { color: colors.muted, fontSize: 10, marginTop: 3 },
    exportCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 24,
      marginTop: 12,
      padding: 20,
    },
    exportDescription: {
      color: colors.subtle,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    exportActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    exportPrimary: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 15,
      flex: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 14,
    },
    exportPrimaryText: {
      color: colors.surface,
      fontSize: 14,
      fontWeight: '800',
    },
    exportSecondary: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 15,
      flex: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 14,
    },
    exportSecondaryText: {
      color: colors.accentRich,
      fontSize: 14,
      fontWeight: '800',
    },
    footnote: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 18,
      marginTop: 16,
      paddingHorizontal: 4,
    },
    pressed: { opacity: 0.62 },
  });
