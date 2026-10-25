import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import {
  CONNECTIVITY_TARGETS,
  probeConnectivity,
  type ProbeResult,
} from '@/features/network-status/bangumi-status';
import { useBangumiStatus } from '@/features/network-status/use-bangumi-status';
import {
  ConnectivityProbeRow,
  ServiceAvailabilityCard,
  ServiceStatusSummary,
} from '@/features/network-status/network-status-cards';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { openExternalUrl } from '@/lib/open-url';

const STATUS_SITE_URL = 'https://status.bgm.tv';

export default function NetworkStatusScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const statusQuery = useBangumiStatus();
  const [probeResults, setProbeResults] = useState<Record<string, ProbeResult>>({});
  const probeRunRef = useRef(0);

  const runProbes = useCallback(() => {
    const runId = ++probeRunRef.current;
    // 只保留已完成的结果：缺失的键即「检测中」。
    setProbeResults({});
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

  const isProbing = CONNECTIVITY_TARGETS.some(
    (target) => !(target.id in probeResults),
  );
  const report = statusQuery.data;

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
          <ServiceStatusSummary report={report} />
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
            <ConnectivityProbeRow
              entry={probeResults[target.id]}
              hasDivider={index > 0}
              host={target.host}
              key={target.id}
              name={target.name}
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
                <ServiceAvailabilityCard
                  component={component}
                  hasDivider={index > 0}
                  key={`${component.domain}-${component.label}`}
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
            void openExternalUrl(STATUS_SITE_URL);
          }}
          style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
        >
          <Text style={styles.footerLinkText}>打开 status.bgm.tv</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: SPACING.xxl + SPACING.sm, paddingHorizontal: SPACING.lg },
    sectionTitle: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.caption.letterSpacing,
      marginBottom: SPACING.sm,
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.lg,
    },
    sectionHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.lg,
    },
    sectionTitleInRow: { marginBottom: SPACING.none },
    retryProbes: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32,
      paddingHorizontal: SPACING.sm,
    },
    retryProbesText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '800' },
    group: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      paddingHorizontal: SPACING.lg,
    },
    centerCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      gap: SPACING.md,
      justifyContent: 'center',
      minHeight: 120,
      padding: SPACING.xl,
    },
    centerText: { color: colors.muted, fontSize: TYPE.caption.fontSize },
    hint: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      lineHeight: TYPE.micro.lineHeight,
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.lg,
    },
    footer: {
      color: colors.subtle,
      fontSize: TYPE.micro.fontSize,
      letterSpacing: TYPE.micro.letterSpacing,
      lineHeight: TYPE.micro.lineHeight,
      marginTop: SPACING.xl,
      textAlign: 'center',
    },
    footerLink: { alignSelf: 'center', marginTop: SPACING.xs, padding: SPACING.sm },
    footerLinkText: {
      color: colors.accent,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '700',
    },
    pressed: { opacity: 0.62 },
  });
