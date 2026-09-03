import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import type { CatalogSubject } from '@/features/catalog/model';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { useTheme } from '@/features/theme/theme-provider';

function formatCount(count?: number) {
  if (count === undefined) {
    return '—';
  }

  return count >= 10_000
    ? `${(count / 10_000).toFixed(1)}万`
    : count.toLocaleString('zh-CN');
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.factValue}>
        {value}
      </Text>
    </View>
  );
}

export function SubjectOverview({
  showsEpisodes,
  subject,
  title,
  totalEpisodes,
  year,
}: {
  showsEpisodes: boolean;
  subject?: CatalogSubject;
  title: string;
  totalEpisodes: number;
  year?: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const rating = subject?.rating;
  const releaseDate =
    subject?.releaseDate?.replaceAll('-', '.') ??
    (year ? String(year) : '时间待定');
  const subjectType = subject?.type ?? 2;
  let format = subject?.format ?? getSubjectTypeLabel(subjectType);
  let formatLabel = '形式';
  let releaseLabel = '发行';
  let extraFact: { label: string; value?: string } | undefined;

  switch (subjectType) {
    case 1:
      releaseLabel = '出版';
      extraFact = {
        label: '页数',
        value: subject?.details.pageCount,
      };
      break;
    case 2:
      releaseLabel = '放送';
      extraFact = showsEpisodes
        ? { label: '章节', value: `${totalEpisodes} 集` }
        : undefined;
      break;
    case 3:
      format = subject?.details.edition ?? format;
      formatLabel = '版本';
      extraFact =
        totalEpisodes > 0
          ? { label: '曲目', value: `${totalEpisodes} 曲` }
          : undefined;
      break;
    case 4:
      format = subject?.details.platforms ?? format;
      formatLabel = '平台';
      extraFact = {
        label: '类型',
        value: subject?.details.gameGenre,
      };
      break;
    case 6:
      releaseLabel = '首播';
      extraFact = showsEpisodes
        ? { label: '章节', value: `${totalEpisodes} 集` }
        : undefined;
      break;
    default:
      extraFact = undefined;
  }
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
        <Fact label={releaseLabel} value={releaseDate} />
        <Fact label={formatLabel} value={format} />
        {extraFact?.value ? (
          <Fact label={extraFact.label} value={extraFact.value} />
        ) : null}
      </View>
      {subject?.originalTitle && subject.originalTitle !== title ? (
        <View style={styles.originalTitleRow}>
          <Text style={styles.originalTitleLabel}>原名</Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.originalTitleValue}>
            {subject.originalTitle}
          </Text>
        </View>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.tagList}>
          {tags.map((tag, index) => (
            <Pressable
              accessibilityLabel={`按标签 ${tag} 浏览`}
              accessibilityRole="link"
              key={`${tag}-${index}`}
              onPress={() =>
                router.push({
                  pathname: '/browse',
                  params: { tag },
                })
              }
              style={({ pressed }) => [
                styles.tag,
                pressed && styles.tagPressed,
              ]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  metrics: { alignItems: 'center', flexDirection: 'row' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: {
    color: colors.ink,
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },
  metricDivider: {
    backgroundColor: colors.track,
    height: 34,
    width: StyleSheet.hairlineWidth,
  },
  divider: {
    backgroundColor: colors.track,
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1 },
  factLabel: { color: colors.subtle, fontSize: 10, fontWeight: '600' },
  factValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  originalTitleRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  originalTitleLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 10,
  },
  originalTitleValue: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  tag: {
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tagPressed: { opacity: 0.6 },
  tagText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
});
