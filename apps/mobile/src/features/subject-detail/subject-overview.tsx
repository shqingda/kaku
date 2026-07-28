import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import type { CatalogSubject } from '@/features/catalog/model';

function formatCount(count?: number) {
  if (count === undefined) {
    return '—';
  }

  return count >= 10_000
    ? `${(count / 10_000).toFixed(1)}万`
    : count.toLocaleString('zh-CN');
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.factValue}>
        {value}
      </Text>
    </View>
  );
}

export function SubjectOverview({
  isAnime,
  subject,
  title,
  totalEpisodes,
  year,
}: {
  isAnime: boolean;
  subject?: CatalogSubject;
  title: string;
  totalEpisodes: number;
  year?: number;
}) {
  const rating = subject?.rating;
  const releaseDate =
    subject?.releaseDate?.replaceAll('-', '.') ??
    (year ? String(year) : '时间待定');
  const format = subject?.format ?? '动画';
  const tags =
    subject?.tags
      .filter((tag) => tag.toLowerCase() !== format.toLowerCase())
      .slice(0, 4) ?? [];

  return (
    <View style={styles.panel}>
      <View style={styles.metrics}>
        <Metric
          label="Bangumi 评分"
          value={rating ? rating.score.toFixed(1) : '—'}
        />
        <View style={styles.metricDivider} />
        <Metric
          label="Bangumi 排名"
          value={rating?.rank ? `#${rating.rank}` : '—'}
        />
        <View style={styles.metricDivider} />
        <Metric label="评分人数" value={formatCount(rating?.votes)} />
      </View>
      <View style={styles.divider} />
      <View style={styles.facts}>
        <Fact label={isAnime ? '放送' : '发行'} value={releaseDate} />
        <Fact label="形式" value={format} />
        {isAnime ? <Fact label="章节" value={`${totalEpisodes} 集`} /> : null}
      </View>
      {subject?.originalTitle && subject.originalTitle !== title ? (
        <View style={styles.originalTitleRow}>
          <Text style={styles.originalTitleLabel}>原名</Text>
          <Text numberOfLines={1} style={styles.originalTitleValue}>
            {subject.originalTitle}
          </Text>
        </View>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.tagList}>
          {tags.map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  metrics: { alignItems: 'center', flexDirection: 'row' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: {
    color: COLORS.ink,
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  metricLabel: {
    color: COLORS.subtle,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },
  metricDivider: {
    backgroundColor: COLORS.track,
    height: 34,
    width: StyleSheet.hairlineWidth,
  },
  divider: {
    backgroundColor: COLORS.track,
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1 },
  factLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: '600' },
  factValue: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  originalTitleRow: {
    alignItems: 'center',
    backgroundColor: '#F6F5F1',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  originalTitleLabel: {
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 10,
  },
  originalTitleValue: {
    color: COLORS.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  tag: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tagText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
});
