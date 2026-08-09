import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import {
  getCollectionStatusLabel,
  getSubjectInfoKeys,
  getSubjectTypeLabel,
} from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import type { CollectionStatus } from '@/features/watching/model';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectQuery = useCatalogSubject(Number(id));
  const subject = subjectQuery.data;
  const subjectTypeLabel = getSubjectTypeLabel(subject?.type);
  const publicInfoKeys = new Set(getSubjectInfoKeys(subject?.type ?? 2));
  const publicInfo =
    subject?.info.filter((item) => publicInfoKeys.has(item.key)) ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: `${subjectTypeLabel}资料` }} />
      {subjectQuery.isPending ? (
        <State title="正在读取条目资料" text="评分与基础资料加载中。" />
      ) : subjectQuery.isError || !subject ? (
        <State
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
              tintColor={COLORS.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
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

function State({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable onPress={action} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  header: { paddingBottom: 20, paddingTop: 14 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  ratingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
  },
  ratingSummary: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    color: COLORS.ink,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  scoreLabel: { color: COLORS.subtle, fontSize: 11, marginTop: 3 },
  rankBlock: { alignItems: 'flex-end', paddingBottom: 3 },
  rank: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  distribution: { gap: 7, marginTop: 22 },
  distributionRow: { alignItems: 'center', flexDirection: 'row' },
  distributionScore: {
    color: COLORS.subtle,
    fontSize: 10,
    textAlign: 'right',
    width: 14,
  },
  distributionTrack: {
    backgroundColor: COLORS.track,
    borderRadius: 99,
    flex: 1,
    height: 5,
    marginHorizontal: 9,
    overflow: 'hidden',
  },
  distributionFill: {
    backgroundColor: COLORS.accent,
    borderRadius: 99,
    height: '100%',
  },
  distributionCount: {
    color: COLORS.subtle,
    fontSize: 10,
    textAlign: 'right',
    width: 34,
  },
  section: { marginTop: 28 },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 19,
  },
  collectionItem: { alignItems: 'center', minWidth: 52 },
  collectionValue: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  collectionLabel: { color: COLORS.subtle, fontSize: 10, marginTop: 5 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  infoRow: { flexDirection: 'row', paddingVertical: 16 },
  infoRowBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoKey: { color: COLORS.subtle, fontSize: 12, width: 78 },
  infoValue: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },
  state: { alignItems: 'center', padding: 32 },
  stateTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
});
