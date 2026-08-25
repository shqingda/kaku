import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { buildBrowsingFootprint } from '@/features/history/browsing-footprint-model';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { HorizontalBarChart } from '@/features/insights/horizontal-bar-chart';
import { useTheme } from '@/features/theme/theme-provider';

export default function FootprintScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { items } = useRecentSubjects();
  const footprint = useMemo(() => buildBrowsingFootprint(items), [items]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>KAKU FOOTPRINT</Text>
        <Text style={styles.title}>你的浏览足迹</Text>
        <Text style={styles.description}>
          基于最多 10 条最近浏览生成，只代表近期探索，不会冒充完整年度报告。
        </Text>

        {items.length ? (
          <>
            <View style={styles.metrics}>
              <Metric label="看过条目" value={footprint.uniqueSubjects} styles={styles} />
              <Metric label="活跃日期" value={footprint.activeDays} styles={styles} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>近期类型分布</Text>
              <Text style={styles.cardDescription}>
                最近 {items.length} 条浏览记录中的媒体类型占比
              </Text>
              <HorizontalBarChart
                denominator={items.length}
                items={footprint.typeCounts.map((item) => ({
                  id: item.type,
                  label: item.label,
                  value: item.count,
                }))}
                valueSuffix="条"
              />
              {footprint.latestViewedAt ? (
                <Text style={styles.latest}>
                  最近浏览于{' '}
                  {new Intl.DateTimeFormat('zh-CN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(footprint.latestViewedAt))}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>足迹还是空的</Text>
            <Text style={styles.emptyText}>
              打开几个条目后，这里会安静地整理你的近期探索。
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  styles,
  value,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Text maxFontSizeMultiplier={1.2} style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.7, lineHeight: 34, marginTop: 8 },
  description: { color: colors.subtle, fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 340 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 28 },
  metricCard: { backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 20, flex: 1, minHeight: 122, padding: 18 },
  metricValue: { color: colors.ink, fontSize: 38, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -1.3, lineHeight: 45 },
  metricLabel: { color: colors.subtle, fontSize: 12, fontWeight: '700', marginTop: 10 },
  card: { backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 20, marginTop: 12, padding: 20 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  cardDescription: { color: colors.subtle, fontSize: 12, lineHeight: 18, marginBottom: 4, marginTop: -6 },
  latest: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 12 },
  emptyCard: { backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 20, marginTop: 28, padding: 22 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  emptyText: { color: colors.subtle, fontSize: 13, lineHeight: 20, marginTop: 6 },
});
