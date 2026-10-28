import { useCallback, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { startupTiming } from '@/lib/startup-timing';
import Sentry from '@/lib/sentry';
import {
  clearDiagnosticRecords,
  type DiagnosticRecord,
  readDiagnosticRecords,
} from '@/lib/diagnostic-log';

function formatDiagnosticTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp));
}

function buildDiagnosticReport(records: DiagnosticRecord[]) {
  const version = Constants.expoConfig?.version ?? '开发版';
  const header = `Kaku ${version} 本地诊断信息\n仅包含应用错误，不包含登录凭证。`;
  const body = records
    .map(
      (record, index) =>
        `\n#${index + 1} ${formatDiagnosticTime(record.createdAt)}\n${record.name}: ${record.message}${record.stack ? `\n${record.stack}` : ''}${record.componentStack ? `\nComponent stack:\n${record.componentStack}` : ''}`,
    )
    .join('\n');

  return `${header}${body}`;
}

export default function DiagnosticsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string>();
  const [clearError, setClearError] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const clearBusy = useRef(false);
  const timing = startupTiming.snapshot();
  const isSentryEnabled = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

  const loadRecords = useCallback(async () => {
    setIsError(false);
    try {
      setRecords(await readDiagnosticRecords());
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecords();
    }, [loadRecords]),
  );

  async function shareRecords() {
    try {
      await Share.share({ message: buildDiagnosticReport(records) });
    } catch {
      Alert.alert('暂时无法共享', '请稍后重试。');
    }
  }

  async function clearRecords() {
    if (clearBusy.current) return;
    clearBusy.current = true;
    setIsClearing(true);
    setClearError(false);
    try {
      await clearDiagnosticRecords();
      setRecords([]);
      setExpandedRecordId(undefined);
    } catch {
      setClearError(true);
    } finally {
      clearBusy.current = false;
      setIsClearing(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '诊断信息' }} />
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在读取本地诊断信息</Text>
        </View>
      ) : isError ? (
        <AppState
          action={() => void loadRecords()}
          text="诊断信息只保存在这台设备上。"
          title="诊断信息读取失败"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <SymbolView
                name={{
                  android: 'security',
                  ios: 'checkmark.shield',
                  web: 'security',
                }}
                size={22}
                tintColor={colors.accent}
              />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>信息仅保存在本机</Text>
              <Text style={styles.introText}>
                Kaku 只记录最近 10 次界面错误，并会隐藏令牌、授权参数和本机用户名。除非你主动共享，否则不会上传。
              </Text>
            </View>
          </View>

          <View style={styles.timingCard}>
            <Text style={styles.timingLabel}>本次 JS 启动分段计时</Text>
            <Text style={styles.sentryState}>不包含原生进程启动；首页指首个收藏区或访客引导可用。</Text>
            {([
              ['JS 首布局', timing.firstLayoutMs],
              ['缓存恢复结束', timing.cacheRestoredMs],
              ['首页可用状态', timing.homeReadyMs],
            ] as const).map(([label, value]) => (
              <Text key={label} style={styles.timingValue}>
                {label}：{value === undefined ? '未记录' : `${value} ms`}
              </Text>
            ))}
            {timing.homeState ? <Text style={styles.sentryState}>
              首页状态：{{ content: '内容', empty: '空态', error: '错误', guest: '访客引导' }[timing.homeState]}
            </Text> : null}
          </View>

          {__DEV__ ? (
            <View style={styles.sentryCard}>
              <Text style={styles.timingLabel}>线上崩溃监控（Sentry）</Text>
              <Text style={styles.sentryState}>
                {isSentryEnabled
                  ? '已启用（配置了 DSN）'
                  : '未启用（未配置 DSN，只会在本机记录错误）'}
              </Text>
              {isSentryEnabled ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Sentry.captureMessage('Kaku 诊断测试上报', {
                      tags: { source: 'diagnostics' },
                    })
                  }
                  style={({ pressed }) => [
                    styles.sentryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.sentryButtonText}>发送测试上报</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {records.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>暂时没有错误记录</Text>
              <Text style={styles.emptyText}>应用运行正常时，这里会保持为空。</Text>
            </View>
          ) : (
            <>
              <View style={styles.headingRow}>
                <Text style={styles.heading}>最近错误</Text>
                <Text style={styles.count}>{records.length} 条</Text>
              </View>
              {records.map((record) => {
                const expanded = expandedRecordId === record.id;
                const details = [record.stack, record.componentStack]
                  .filter(Boolean)
                  .join('\n');

                return (
                  <Pressable
                    accessibilityHint={expanded ? '收起错误详情' : '展开错误详情'}
                    accessibilityRole="button"
                    key={record.id}
                    onPress={() =>
                      setExpandedRecordId(expanded ? undefined : record.id)
                    }
                    style={({ pressed }) => [
                      styles.recordCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.recordHeader}>
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.recordName}>
                        {record.name}
                      </Text>
                      <Text style={styles.recordTime}>
                        {formatDiagnosticTime(record.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.recordMessage}>{record.message}</Text>
                    {details ? (
                      <Text
                        numberOfLines={expanded ? undefined : 3}
                        selectable={expanded}
                        style={styles.recordDetails}
                      >
                        {details}
                      </Text>
                    ) : null}
                    <Text style={styles.expandLabel}>
                      {expanded ? '收起详情' : '查看详情'}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void shareRecords()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>共享诊断信息</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void clearRecords()}
                  disabled={isClearing}
                  accessibilityState={{ busy: isClearing, disabled: isClearing }}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.clearButtonText}>{isClearing ? '正在清空…' : clearError ? '清空失败，点击重试' : '清空记录'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    centerState: {
      alignItems: 'center',
      flex: 1,
      gap: SPACING.md,
      justifyContent: 'center',
    },
    stateText: { color: colors.muted, ...TYPE.body },
    content: { padding: SPACING.xl, paddingBottom: SPACING.xxl + SPACING.md },
    introCard: {
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      flexDirection: 'row',
      padding: SPACING.lg,
    },
    introIcon: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderCurve: 'continuous',
      borderRadius: 14,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    introCopy: { flex: 1, marginLeft: SPACING.lg },
    introTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
    introText: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.xs },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      marginTop: SPACING.lg,
      padding: SPACING.xxl,
    },
    emptyTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
    emptyText: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
    timingCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      marginTop: SPACING.lg,
      padding: SPACING.lg,
    },
    timingLabel: { color: colors.muted, ...TYPE.micro, fontWeight: '700' },
    timingValue: { color: colors.ink, ...TYPE.body, fontWeight: '800', marginTop: SPACING.sm },
    sentryCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      marginTop: SPACING.lg,
      padding: SPACING.lg,
    },
    sentryState: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.xs },
    sentryButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      justifyContent: 'center',
      marginTop: SPACING.md,
      minHeight: 40,
      paddingHorizontal: SPACING.lg,
    },
    sentryButtonText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
    headingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.xs,
    },
    heading: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
    count: { color: colors.subtle, ...TYPE.micro, fontWeight: '600' },
    recordCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      marginBottom: SPACING.md,
      padding: SPACING.lg,
    },
    recordHeader: { alignItems: 'center', flexDirection: 'row' },
    recordName: { color: colors.ink, flex: 1, ...TYPE.body, fontWeight: '800' },
    recordTime: { color: colors.subtle, ...TYPE.micro, marginLeft: SPACING.md },
    recordMessage: { color: colors.ink, ...TYPE.body, marginTop: SPACING.sm },
    recordDetails: {
      color: colors.muted,
      fontFamily: Platform.select({ android: 'monospace', ios: 'Courier' }),
      ...TYPE.micro,
      marginTop: SPACING.md,
    },
    expandLabel: { color: colors.accent, ...TYPE.micro, fontWeight: '700', marginTop: SPACING.md },
    actions: { gap: SPACING.md, marginTop: SPACING.lg },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderCurve: 'continuous',
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 52,
    },
    primaryButtonText: {
      color: colors.surface,
      ...TYPE.body,
      fontWeight: '800',
    },
    clearButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 52,
    },
    clearButtonText: { color: colors.accent, ...TYPE.body, fontWeight: '700' },
    pressed: { opacity: 0.62 },
  });
