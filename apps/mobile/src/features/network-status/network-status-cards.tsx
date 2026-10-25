import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import type { ProbeResult, ServiceLevel, StatusReport } from './bangumi-status';

// 与系统状态色一致的语义色（settings 页沿用同一套硬编码）。
const LEVEL_GREEN = '#34C759';
const LEVEL_AMBER = '#FF9F0A';
const LEVEL_RED = '#FF3B30';

// 服务状态展示元数据查表：颜色、文案、图标、总览标题随级别一次取齐。
// unknown 的颜色随主题，所以 tint 统一收颜色参数。
const LEVEL_META: Record<
  ServiceLevel,
  {
    label: string;
    symbol: SymbolViewProps['name'];
    title: string;
    tint: (colors: ThemeColors) => string;
  }
> = {
  ok: {
    label: '正常',
    symbol: {
      android: 'check_circle',
      ios: 'checkmark.circle.fill',
      web: 'check_circle',
    },
    title: 'Bangumi 服务正常',
    tint: () => LEVEL_GREEN,
  },
  degraded: {
    label: '降级',
    symbol: {
      android: 'error_outline',
      ios: 'exclamationmark.triangle.fill',
      web: 'error_outline',
    },
    title: 'Bangumi 部分服务降级',
    tint: () => LEVEL_AMBER,
  },
  down: {
    label: '中断',
    symbol: { android: 'cancel', ios: 'xmark.circle.fill', web: 'cancel' },
    title: 'Bangumi 服务中断',
    tint: () => LEVEL_RED,
  },
  unknown: {
    label: '未知',
    symbol: {
      android: 'help_outline',
      ios: 'questionmark.circle',
      web: 'help_outline',
    },
    title: '服务状态未知',
    tint: (colors) => colors.subtle,
  },
};

function formatUpdatedTime(timestampMs: number) {
  const date = new Date(timestampMs);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return sameDay
    ? time
    : new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function formatIncidentDay(timestampS: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestampS * 1000));
}

function formatDuration(seconds: number) {
  if (seconds < 90) return `${seconds} 秒`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} 分钟`;
  return `${(seconds / 3600).toFixed(1)} 小时`;
}

function formatUptime(uptime: number | null) {
  return uptime === null ? '—' : `${uptime.toFixed(uptime >= 99.95 ? 1 : 2)}%`;
}

export function ServiceStatusSummary({
  report,
}: {
  report: StatusReport;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const meta = LEVEL_META[report.level];
  const tint = meta.tint(colors);
  const showDetail = report.level !== 'ok' && report.message;

  return (
    <View style={styles.overallCard}>
      <View
        accessibilityLabel={`${meta.title}，${formatUpdatedTime(
          report.updatedAt === null ? Date.now() : report.updatedAt * 1000,
        )}更新`}
        style={styles.overallHeader}
      >
        <View style={styles.overallIcon}>
          <SymbolView
            name={meta.symbol}
            size={24}
            tintColor={tint}
          />
        </View>
        <View style={styles.overallCopy}>
          <Text style={styles.overallTitle}>{meta.title}</Text>
          {showDetail ? (
            <Text style={styles.overallMessage}>{report.message}</Text>
          ) : null}
          <Text style={styles.overallMeta}>
            {formatUpdatedTime(
              report.updatedAt === null ? Date.now() : report.updatedAt * 1000,
            )}
            {' 更新 · '}
            {report.components.length} 项服务
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ConnectivityProbeRow({
  entry,
  hasDivider,
  host,
  name,
}: {
  entry: ProbeResult | undefined;
  hasDivider: boolean;
  host: string;
  name: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  // entry 为 undefined 表示该探测尚未完成。
  let tint = colors.subtle;
  let stateText = '检测中';
  let dotColor = colors.track;

  if (entry) {
    if (entry.state === 'failed') {
      tint = LEVEL_RED;
      stateText = entry.detail ?? '连接失败';
    } else {
      tint = entry.state === 'slow' ? LEVEL_AMBER : LEVEL_GREEN;
      stateText = `${entry.latencyMs ?? 0} ms${entry.state === 'slow' ? ' · 偏慢' : ''}`;
    }
    dotColor = tint;
  }

  return (
    <View
      accessibilityLabel={`${name} ${host}，${stateText}`}
      style={[styles.probeRow, hasDivider && styles.rowDivider]}
    >
      <View style={[styles.probeDot, { backgroundColor: dotColor }]} />
      <View style={styles.probeCopy}>
        <Text style={styles.probeName}>{name}</Text>
        <Text style={styles.probeHost}>{host}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.probeState, { color: tint }]}>
        {stateText}
      </Text>
    </View>
  );
}

export function ServiceAvailabilityCard({
  component,
  hasDivider,
}: {
  component: StatusReport['components'][number];
  hasDivider: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const meta = LEVEL_META[component.level];
  const tint = meta.tint(colors);
  const incident = component.latestIncident;

  return (
    <View style={[styles.componentCard, hasDivider && styles.rowDivider]}>
      <View style={styles.componentHeader}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.componentLabel}>
          {component.label}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: `${tint}1F` }]}>
          <View style={[styles.levelPillDot, { backgroundColor: tint }]} />
          <Text style={[styles.levelPillText, { color: tint }]}>
            {meta.label}
          </Text>
        </View>
      </View>
      {component.days.length > 0 ? (
        <View
          accessibilityLabel={`${component.label}，近 30 天可用率 ${formatUptime(
            component.uptime30d,
          )}`}
          style={styles.dayBars}
        >
          {component.days.map((day) => (
            <View
              key={day.day}
              style={[
                styles.dayBar,
                {
                  backgroundColor:
                    day.level === 'unknown'
                      ? colors.track
                      : LEVEL_META[day.level].tint(colors),
                },
              ]}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.componentMeta}>
        <Text style={styles.componentMetaText}>
          30 天可用率 {formatUptime(component.uptime30d)}
        </Text>
        {component.avgLatencyMs !== null ? (
          <Text style={styles.componentMetaText}>
            探针平均 {component.avgLatencyMs} ms
          </Text>
        ) : null}
      </View>
      {incident ? (
        <Text style={styles.incidentText}>
          最近一次{incident.level === 'down' ? '中断' : '降级'}：
          {formatIncidentDay(incident.startedAt)} · 持续{' '}
          {formatDuration(incident.durationS)}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    rowDivider: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    overallCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      padding: SPACING.lg,
    },
    overallHeader: { alignItems: 'center', flexDirection: 'row' },
    overallIcon: {
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderCurve: 'continuous',
      borderRadius: 16,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    overallCopy: { flex: 1, marginLeft: SPACING.lg },
    overallTitle: { color: colors.ink, fontSize: TYPE.heading.fontSize, fontWeight: '800' },
    overallMessage: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      lineHeight: TYPE.caption.lineHeight,
      marginTop: SPACING.xs,
    },
    overallMeta: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      marginTop: SPACING.xs,
    },
    probeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 60,
      paddingVertical: SPACING.md,
    },
    probeDot: { borderRadius: 5, height: 10, width: 10 },
    probeCopy: { flex: 1, marginLeft: SPACING.md },
    probeName: { color: colors.ink, fontSize: TYPE.body.fontSize, fontWeight: '700' },
    probeHost: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      marginTop: SPACING.xs / 2,
    },
    probeState: {
      fontSize: TYPE.caption.fontSize,
      fontWeight: '700',
      marginLeft: SPACING.md,
      maxWidth: 150,
      textAlign: 'right',
    },
    componentCard: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    componentHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.md,
      justifyContent: 'space-between',
    },
    componentLabel: {
      color: colors.ink,
      flex: 1,
      fontSize: TYPE.body.fontSize,
      fontWeight: '800',
    },
    levelPill: {
      alignItems: 'center',
      borderCurve: 'continuous',
      borderRadius: 9,
      flexDirection: 'row',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    levelPillDot: { borderRadius: 3, height: 6, width: 6 },
    levelPillText: { fontSize: TYPE.micro.fontSize, fontWeight: '800' },
    dayBars: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: SPACING.xs / 2,
      height: 26,
      marginTop: SPACING.md,
    },
    dayBar: { borderCurve: 'continuous', borderRadius: 2, flex: 1 },
    componentMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.lg,
      marginTop: SPACING.sm,
    },
    componentMetaText: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
    },
    incidentText: {
      color: colors.muted,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      marginTop: SPACING.sm,
    },
  });
