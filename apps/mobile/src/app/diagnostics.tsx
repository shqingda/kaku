import { useCallback, useMemo, useState } from 'react';
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

import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { getFirstContentDelayMs } from '@/lib/startup-timing';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string>();

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

  function confirmClearRecords() {
    Alert.alert('清空诊断信息？', '此操作不会影响登录、收藏或缓存。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: () => {
          void clearDiagnosticRecords()
            .then(() => {
              setRecords([]);
              setExpandedRecordId(undefined);
            })
            .catch(() => Alert.alert('暂时无法清空', '请稍后重试。'));
        },
        style: 'destructive',
        text: '清空',
      },
    ]);
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
            <Text style={styles.timingLabel}>本次启动到首页首屏</Text>
            <Text style={styles.timingValue}>
              {getFirstContentDelayMs() === undefined
                ? '未记录（首页尚未打开）'
                : `${getFirstContentDelayMs()} ms`}
            </Text>
          </View>

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
                      <Text numberOfLines={1} style={styles.recordName}>
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
                  onPress={confirmClearRecords}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.clearButtonText}>清空记录</Text>
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
      gap: 12,
      justifyContent: 'center',
    },
    stateText: { color: colors.muted, fontSize: 14 },
    content: { padding: 20, paddingBottom: 44 },
    introCard: {
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      flexDirection: 'row',
      padding: 18,
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
    introCopy: { flex: 1, marginLeft: 14 },
    introTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
    introText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      marginTop: 14,
      padding: 32,
    },
    emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.muted, fontSize: 13, marginTop: 7 },
    timingCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      marginTop: 14,
      padding: 18,
    },
    timingLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    timingValue: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 6 },
    headingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      marginTop: 26,
      paddingHorizontal: 4,
    },
    heading: { color: colors.ink, fontSize: 18, fontWeight: '800' },
    count: { color: colors.subtle, fontSize: 12, fontWeight: '600' },
    recordCard: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      marginBottom: 10,
      padding: 18,
    },
    recordHeader: { alignItems: 'center', flexDirection: 'row' },
    recordName: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800' },
    recordTime: { color: colors.subtle, fontSize: 10, marginLeft: 12 },
    recordMessage: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 9 },
    recordDetails: {
      color: colors.muted,
      fontFamily: Platform.select({ android: 'monospace', ios: 'Courier' }),
      fontSize: 10,
      lineHeight: 15,
      marginTop: 12,
    },
    expandLabel: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 12 },
    actions: { gap: 10, marginTop: 14 },
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
      fontSize: 15,
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
    clearButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
    pressed: { opacity: 0.62 },
  });
