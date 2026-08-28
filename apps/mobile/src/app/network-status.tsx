import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import {
  CONNECTIVITY_TARGETS,
  probeConnectivity,
  type ProbeResult,
  type ServiceLevel,
  type StatusReport,
} from '@/features/network-status/bangumi-status';
import { useBangumiStatus } from '@/features/network-status/use-bangumi-status';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';

// 与系统状态色一致的语义色（settings 页沿用同一套硬编码）。
const LEVEL_GREEN = '#34C759';
const LEVEL_AMBER = '#FF9F0A';
const LEVEL_RED = '#FF3B30';

const STATUS_SITE_URL = 'https://status.bgm.tv';

type ProbeEntry = ProbeResult | 'pending';

function levelTint(level: ServiceLevel, colors: ThemeColors) {
  switch (level) {
    case 'ok':
      return LEVEL_GREEN;
    case 'degraded':
      return LEVEL_AMBER;
    case 'down':
      return LEVEL_RED;
    default:
      return colors.subtle;
  }
}

function levelLabel(level: ServiceLevel) {
  switch (level) {
    case 'ok':
      return '正常';
    case 'degraded':
      return '降级';
    case 'down':
      return '中断';
    default:
      return '未知';
  }
}

function overallTitle(level: ServiceLevel) {
  switch (level) {
    case 'ok':
      return 'Bangumi 服务正常';
    case 'degraded':
      return 'Bangumi 部分服务降级';
    case 'down':
      return 'Bangumi 服务中断';
    default:
      return '服务状态未知';
  }
}

function overallSymbol(level: ServiceLevel): SymbolViewProps['name'] {
  switch (level) {
    case 'ok':
      return { android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' };
    case 'degraded':
      return {
        android: 'error_outline',
        ios: 'exclamationmark.triangle.fill',
        web: 'error_outline',
      };
    case 'down':
      return { android: 'cancel', ios: 'xmark.circle.fill', web: 'cancel' };
    default:
      return { android: 'help_outline', ios: 'questionmark.circle', web: 'help_outline' };
  }
}

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

export default function NetworkStatusScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusQuery = useBangumiStatus();
  const [probeResults, setProbeResults] = useState<Record<string, ProbeEntry>>({});
  const probeRunRef = useRef(0);

  const runProbes = useCallback(() => {
    const runId = ++probeRunRef.current;
    setProbeResults(
      Object.fromEntries(
        CONNECTIVITY_TARGETS.map((target) => [target.id, 'pending']),
      ),
    );
    for (const target of CONNECTIVITY_TARGETS) {
      void probeConnectivity(target.url).then((result) => {
        if (probeRunRef.current !== runId) return;
        setProbeResults((previous) => ({ ...previous, [target.id]: result }));
      });
    }
  }, []);

  useEffect(() => {
    runProbes();
  }, [runProbes]);

  const isProbing = Object.values(probeResults).some((entry) => entry === 'pending');
  const report = statusQuery.data as StatusReport | undefined;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '网络诊断' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => {
              void statusQuery.refetch();
              runProbes();
            }}
            refreshing={statusQuery.isRefetching}
          />
        }
      >
        <Text style={styles.sectionTitle}>服务状态</Text>
        {statusQuery.isPending ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.centerText}>正在获取 Bangumi 服务状态</Text>
          </View>
        ) : statusQuery.isError || !report ? (
          <AppState
            action={() => void statusQuery.refetch()}
            text="无法连接 status.bgm.tv。可能是你的网络不可用，或监控服务暂时离线。"
            title="服务状态获取失败"
          />
        ) : (
          <OverallCard colors={colors} report={report} styles={styles} />
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
            本机连通性
          </Text>
          <Pressable
            accessibilityLabel="重新检测本机连通性"
            accessibilityRole="button"
            disabled={isProbing}
            hitSlop={HIT_SLOP}
            onPress={() => {
              playSelectionHaptic();
              runProbes();
            }}
            style={({ pressed }) => [styles.retryProbes, pressed && styles.pressed]}
          >
            {isProbing ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.retryProbesText}>重新检测</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.group}>
          {CONNECTIVITY_TARGETS.map((target, index) => (
            <ProbeRow
              colors={colors}
              entry={probeResults[target.id]}
              hasDivider={index > 0}
              host={target.host}
              key={target.id}
              name={target.name}
              styles={styles}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          从这台设备直接请求各域名，测量到收到响应为止的耗时。
        </Text>

        {report ? (
          <>
            <Text style={styles.sectionTitle}>服务可用率（近 30 天）</Text>
            <View style={styles.group}>
              {report.components.map((component, index) => (
                <ComponentCard
                  colors={colors}
                  component={component}
                  hasDivider={index > 0}
                  key={`${component.domain}-${component.label}`}
                  styles={styles}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.footer}>
          status.bgm.tv 是社区维护的独立监控，与 Bangumi 官方无关。
        </Text>
        <Pressable
          accessibilityLabel="在浏览器打开 status.bgm.tv"
          accessibilityRole="link"
          hitSlop={HIT_SLOP}
          onPress={() => {
            void Linking.openURL(STATUS_SITE_URL).catch(() =>
              Alert.alert('暂时无法打开', '请检查网络后重试。'),
            );
          }}
          style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
        >
          <Text style={styles.footerLinkText}>打开 status.bgm.tv</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OverallCard({
  colors,
  report,
  styles,
}: {
  colors: ThemeColors;
  report: StatusReport;
  styles: ReturnType<typeof createStyles>;
}) {
  const tint = levelTint(report.level, colors);
  const showDetail = report.level !== 'ok' && report.message;

  return (
    <View style={styles.overallCard}>
      <View
        accessibilityLabel={`${overallTitle(report.level)}，${formatUpdatedTime(
          report.updatedAt === null ? Date.now() : report.updatedAt * 1000,
        )}更新`}
        style={styles.overallHeader}
      >
        <View style={styles.overallIcon}>
          <SymbolView
            name={overallSymbol(report.level)}
            size={24}
            tintColor={tint}
          />
        </View>
        <View style={styles.overallCopy}>
          <Text style={styles.overallTitle}>{overallTitle(report.level)}</Text>
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

function ProbeRow({
  colors,
  entry,
  hasDivider,
  host,
  name,
  styles,
}: {
  colors: ThemeColors;
  entry: ProbeEntry | undefined;
  hasDivider: boolean;
  host: string;
  name: string;
  styles: ReturnType<typeof createStyles>;
}) {
  let tint = colors.subtle;
  let stateText = '等待检测';
  let dotColor = colors.track;

  if (entry === 'pending') {
    stateText = '检测中';
  } else if (entry) {
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
      accessibilityLabel={`${name} ${host}，${
        entry === 'pending' ? '检测中' : stateText
      }`}
      style={[styles.probeRow, hasDivider && styles.rowDivider]}
    >
      <View style={[styles.probeDot, { backgroundColor: dotColor }]} />
      <View style={styles.probeCopy}>
        <Text style={styles.probeName}>{name}</Text>
        <Text style={styles.probeHost}>{host}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.probeState, { color: tint }]}>
        {stateText}
      </Text>
    </View>
  );
}

function ComponentCard({
  colors,
  component,
  hasDivider,
  styles,
}: {
  colors: ThemeColors;
  component: StatusReport['components'][number];
  hasDivider: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const tint = levelTint(component.level, colors);
  const incident = component.latestIncident;

  return (
    <View style={[styles.componentCard, hasDivider && styles.rowDivider]}>
      <View style={styles.componentHeader}>
        <Text numberOfLines={1} style={styles.componentLabel}>
          {component.label}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: `${tint}1F` }]}>
          <View style={[styles.levelPillDot, { backgroundColor: tint }]} />
          <Text style={[styles.levelPillText, { color: tint }]}>
            {levelLabel(component.level)}
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
                    day.level === 'unknown' ? colors.track : levelTint(day.level, colors),
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
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: 40, paddingHorizontal: 20 },
    sectionTitle: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.caption.letterSpacing,
      marginBottom: 8,
      marginTop: 26,
      paddingHorizontal: 16,
    },
    sectionHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 26,
      paddingHorizontal: 16,
    },
    sectionTitleInRow: { marginBottom: 0 },
    retryProbes: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32,
      paddingHorizontal: 8,
    },
    retryProbesText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '800' },
    group: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    rowDivider: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    centerCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      gap: 12,
      justifyContent: 'center',
      minHeight: 120,
      padding: 24,
    },
    centerText: { color: colors.muted, fontSize: TYPE.caption.fontSize },
    overallCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      padding: 18,
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
    overallCopy: { flex: 1, marginLeft: 14 },
    overallTitle: { color: colors.ink, fontSize: TYPE.heading.fontSize, fontWeight: '800' },
    overallMessage: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      lineHeight: 18,
      marginTop: 3,
    },
    overallMeta: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      marginTop: 5,
    },
    probeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 60,
      paddingVertical: 10,
    },
    probeDot: { borderRadius: 5, height: 10, width: 10 },
    probeCopy: { flex: 1, marginLeft: 12 },
    probeName: { color: colors.ink, fontSize: TYPE.body.fontSize, fontWeight: '700' },
    probeHost: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      marginTop: 2,
    },
    probeState: {
      fontSize: TYPE.caption.fontSize,
      fontWeight: '700',
      marginLeft: 12,
      maxWidth: 150,
      textAlign: 'right',
    },
    hint: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      lineHeight: 16,
      marginTop: 8,
      paddingHorizontal: 16,
    },
    componentCard: { paddingHorizontal: 16, paddingVertical: 14 },
    componentHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
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
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    levelPillDot: { borderRadius: 3, height: 6, width: 6 },
    levelPillText: { fontSize: TYPE.micro.fontSize, fontWeight: '800' },
    dayBars: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: 2,
      height: 26,
      marginTop: 12,
    },
    dayBar: { borderCurve: 'continuous', borderRadius: 2, flex: 1 },
    componentMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 14,
      marginTop: 8,
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
      marginTop: 6,
    },
    footer: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      lineHeight: 16,
      marginTop: 28,
      textAlign: 'center',
    },
    footerLink: { alignSelf: 'center', marginTop: 4, padding: 8 },
    footerLinkText: {
      color: colors.accent,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '700',
    },
    pressed: { opacity: 0.62 },
  });
