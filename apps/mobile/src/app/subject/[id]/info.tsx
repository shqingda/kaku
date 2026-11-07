import { Stack, useLocalSearchParams } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import {
  getCollectionStatusLabel,
  getSubjectInfoKeys,
  getSubjectTypeLabel,
} from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import type { CollectionStatus } from '@/features/watching/model';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';
import { loadStatus } from '@/lib/query-status';

const COLLECTION_STATUSES: CollectionStatus[] = [
  'wish',
  'doing',
  'completed',
  'onHold',
  'dropped',
];

function formatCount(value: number) {
  return value >= 10_000
    ? `${(value / 10_000).toFixed(value >= 100_000 ? 0 : 1)}万`
    : value.toLocaleString('zh-CN');
}

export default function SubjectInfoScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const subjectQuery = useCatalogSubject(subjectId ?? 0);
  const subject = subjectQuery.data;
  const subjectTypeLabel = getSubjectTypeLabel(subject?.type);
  const publicInfoKeys = new Set(getSubjectInfoKeys(subject?.type ?? 2));
  const publicInfo =
    subject?.info.filter((item) => publicInfoKeys.has(item.key)) ?? [];

  if (!subjectId) {
    return <InvalidRouteState message="这个资料链接缺少有效条目编号。" />;
  }

  const subjectStatus = loadStatus(subjectQuery);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: `${subjectTypeLabel}资料` }} />
      {subjectStatus.isPending ? (
        <AppState title="正在读取条目资料" text="评分与基础资料加载中。" />
      ) : !subject ? (
        <AppState
          action={() => void subjectQuery.refetch()}
          title="条目资料读取失败"
          text="请检查网络后重试。"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={() => void subjectQuery.refetch()}
              refreshing={
                subjectQuery.isRefetching && !subjectQuery.isPending
              }
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {subjectQuery.isError ? (
            <CachedDataNotice onRetry={() => void subjectQuery.refetch()} retrying={subjectQuery.isRefetching} />
          ) : null}
          <View style={styles.header}>
            <Text style={styles.title}>评分与资料</Text>
            <Text style={styles.meta}>
              来自 Bangumi 的公开{subjectTypeLabel}数据
            </Text>
          </View>

          <View style={styles.ratingCard}>
            <View style={styles.ratingSummary}>
              <View>
                <Text style={styles.score}>
                  {subject.rating?.score.toFixed(1) ?? '—'}
                </Text>
                <Text style={styles.scoreLabel}>Bangumi 评分</Text>
              </View>
              <View style={styles.rankBlock}>
                <Text style={styles.rank}>
                  {subject.rating?.rank ? `#${subject.rating.rank}` : '—'}
                </Text>
                <Text style={styles.scoreLabel}>
                  {formatCount(subject.rating?.votes ?? 0)} 人评分
                </Text>
              </View>
            </View>
            <RatingDistribution
              distribution={subject.rating?.distribution ?? {}}
            />
          </View>

          {subject.collectionStats ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>收藏状态</Text>
              <View style={styles.collectionCard}>
                {COLLECTION_STATUSES.map((status) => (
                  <View key={status} style={styles.collectionItem}>
                    <Text style={styles.collectionValue}>
                      {formatCount(subject.collectionStats?.[status] ?? 0)}
                    </Text>
                    <Text style={styles.collectionLabel}>
                      {getCollectionStatusLabel(subject.type, status)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基础资料</Text>
            <View style={styles.infoCard}>
              {publicInfo.length > 0 ? (
                publicInfo.map((item, index) => (
                  <View
                    key={`${item.key}-${index}`}
                    style={[
                      styles.infoRow,
                      index > 0 && styles.infoRowBorder,
                    ]}
                  >
                    <Text style={styles.infoKey}>{item.key}</Text>
                    <Text selectable style={styles.infoValue}>
                      {item.value}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>暂无更多基础资料。</Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RatingDistribution({
  distribution,
}: {
  distribution: Record<number, number>;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <View style={styles.distribution}>
      {Array.from({ length: 10 }, (_, index) => 10 - index).map((score) => {
        const count = distribution[score] ?? 0;

        return (
          <View key={score} style={styles.distributionRow}>
            <Text style={styles.distributionScore}>{score}</Text>
            <View style={styles.distributionTrack}>
              <View
                style={[
                  styles.distributionFill,
                  { width: `${(count / maxCount) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.distributionCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xxl + SPACING.lg, paddingHorizontal: SPACING.xl },
  header: { paddingBottom: SPACING.xl, paddingTop: SPACING.lg },
  title: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
  },
  meta: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SPACING.xl,
  },
  ratingSummary: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    color: colors.ink,
    ...TYPE.hero,
    fontWeight: '800',
  },
  scoreLabel: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  rankBlock: { alignItems: 'flex-end', paddingBottom: SPACING.xs },
  rank: { color: colors.ink, ...TYPE.title, fontWeight: '800' },
  distribution: { gap: SPACING.sm, marginTop: SPACING.xl },
  distributionRow: { alignItems: 'center', flexDirection: 'row' },
  distributionScore: {
    color: colors.subtle,
    ...TYPE.micro,
    textAlign: 'right',
    width: 14,
  },
  distributionTrack: {
    backgroundColor: colors.track,
    borderRadius: 99,
    flex: 1,
    height: 5,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  distributionFill: {
    backgroundColor: colors.accent,
    borderRadius: 99,
    height: '100%',
  },
  distributionCount: {
    color: colors.subtle,
    ...TYPE.micro,
    textAlign: 'right',
    width: 34,
  },
  section: { marginTop: SPACING.xxl },
  sectionTitle: {
    color: colors.ink,
    ...TYPE.title,
    fontWeight: '800',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  collectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  collectionItem: { alignItems: 'center', minWidth: 52 },
  collectionValue: { color: colors.ink, ...TYPE.body, fontWeight: '800' },
  collectionLabel: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  infoRow: { flexDirection: 'row', paddingVertical: SPACING.lg },
  infoRowBorder: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoKey: { color: colors.subtle, ...TYPE.caption, width: 78 },
  infoValue: {
    color: colors.ink,
    flex: 1,
    ...TYPE.caption,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.muted,
    ...TYPE.body,
    paddingVertical: SPACING.xl,
    textAlign: 'center',
  },
});
