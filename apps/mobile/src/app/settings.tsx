import { useMemo, type ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { HIT_SLOP, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { useSearchHistory } from '@/features/search/search-history-provider';
import type { ThemePreference } from '@/features/preferences/preferences-model';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';

const STATUS_GREEN = '#34C759';
const STATUS_RED = '#FF3B30';

type SyncStatus = 'failed' | 'idle' | 'success' | 'syncing';
type SymbolName = ComponentProps<typeof SymbolView>['name'];

const THEME_OPTIONS: {
  description: string;
  label: string;
  value: ThemePreference;
}[] = [
  {
    description: '自动匹配系统的浅色或深色外观。',
    label: '跟随系统',
    value: 'system',
  },
  {
    description: '始终使用浅色外观。',
    label: '浅色',
    value: 'light',
  },
  {
    description: '始终使用深色外观。',
    label: '深色',
    value: 'dark',
  },
];

const STATUS_ICONS: Record<SyncStatus, SymbolName> = {
  failed: { android: 'cancel', ios: 'xmark.circle.fill', web: 'cancel' },
  idle: { android: 'cloud_off', ios: 'icloud.slash', web: 'cloud_off' },
  success: {
    android: 'check_circle',
    ios: 'checkmark.circle.fill',
    web: 'check_circle',
  },
  syncing: {
    android: 'sync',
    ios: 'arrow.triangle.2.circlepath',
    web: 'sync',
  },
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  failed: '同步失败',
  idle: '未同步',
  success: '已同步',
  syncing: '正在同步',
};

function getSyncStatus({
  available,
  enabled,
  error,
  signedIn,
  syncing,
}: {
  available: boolean;
  enabled: boolean;
  error: string | null;
  signedIn: boolean;
  syncing: boolean;
}): SyncStatus {
  if (!signedIn || !enabled || !available) return 'idle';
  if (syncing) return 'syncing';
  if (error) return 'failed';
  return 'success';
}

export default function SettingsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const {
    cloudError,
    cloudSyncAvailable,
    preferences,
    retryCloudSync,
    setSyncEnabled,
    setTheme,
    syncing,
  } = usePreferences();
  const recentSubjects = useRecentSubjects();
  const searchHistory = useSearchHistory();
  const signedIn = Boolean(session);
  const channels = [
    {
      key: 'appearance',
      label: '外观',
      onRetry: () => void retryCloudSync(),
      status: getSyncStatus({
        available: cloudSyncAvailable,
        enabled: preferences.syncEnabled,
        error: cloudError,
        signedIn,
        syncing,
      }),
    },
    {
      key: 'search',
      label: '最近搜索',
      onRetry: () => void searchHistory.retryCloudSync(),
      status: getSyncStatus({
        available: cloudSyncAvailable,
        enabled: preferences.syncEnabled,
        error: searchHistory.cloudError,
        signedIn,
        syncing: searchHistory.syncing,
      }),
    },
    {
      key: 'browse',
      label: '最近浏览',
      onRetry: () => void recentSubjects.retryCloudSync(),
      status: getSyncStatus({
        available: cloudSyncAvailable,
        enabled: preferences.syncEnabled,
        error: recentSubjects.cloudError,
        signedIn,
        syncing: recentSubjects.syncing,
      }),
    },
  ] as const;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>
          外观
        </Text>
        <View style={styles.group}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = preferences.theme === option.value;

            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={option.value}
                onPress={() => {
                  if (isSelected) return;
                  playSelectionHaptic();
                  setTheme(option.value);
                }}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowCopy}>
                  <Text
                    style={[
                      styles.rowTitle,
                      isSelected && styles.rowTitleSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.rowDescription}>
                    {option.description}
                  </Text>
                </View>
                {isSelected ? (
                  <SymbolView
                    name={{
                      android: 'check',
                      ios: 'checkmark',
                      web: 'check',
                    }}
                    size={18}
                    tintColor={colors.accent}
                    weight="semibold"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>同步</Text>
        <View style={styles.group}>
          {session ? (
            <View style={styles.syncBlock}>
              <View style={styles.syncHeader}>
                <Text style={styles.rowTitle}>云同步</Text>
                <Switch
                  accessibilityLabel="云同步"
                  disabled={!cloudSyncAvailable}
                  ios_backgroundColor={colors.track}
                  onValueChange={(enabled) => {
                    playSelectionHaptic();
                    setSyncEnabled(enabled);
                  }}
                  testID="preference-sync-switch"
                  trackColor={{ false: colors.track, true: colors.accent }}
                  value={preferences.syncEnabled}
                />
              </View>
              <View style={styles.statusList}>
                {channels.map((channel) => (
                  <SyncStatusRow
                    colors={colors}
                    key={channel.key}
                    label={channel.label}
                    onRetry={channel.onRetry}
                    status={channel.status}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="前往登录"
              accessibilityRole="button"
              onPress={() => router.push('/account')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>设备间同步</Text>
                <Text numberOfLines={1} style={styles.rowDescription}>
                  登录后即可在设备间同步。
                </Text>
              </View>
              <Text style={styles.rowAction}>去登录</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SyncStatusRow({
  colors,
  label,
  onRetry,
  status,
  styles,
}: {
  colors: ThemeColors;
  label: string;
  onRetry: () => void;
  status: SyncStatus;
  styles: ReturnType<typeof createStyles>;
}) {
  const tint =
    status === 'success'
      ? STATUS_GREEN
      : status === 'failed'
        ? STATUS_RED
        : colors.subtle;
  const content = (
    <>
      <SymbolView
        name={STATUS_ICONS[status]}
        size={15}
        tintColor={tint}
        weight="medium"
      />
      <Text style={styles.statusLabel}>{label}</Text>
    </>
  );

  if (status === 'failed') {
    return (
      <Pressable
        accessibilityHint="点此重试"
        accessibilityLabel={`${label}，${STATUS_LABELS[status]}`}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        onPress={onRetry}
        style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={`${label}，${STATUS_LABELS[status]}`}
      style={styles.statusRow}
    >
      {content}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 8 },
    sectionTitle: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.caption.letterSpacing,
      marginBottom: 8,
      marginTop: 28,
      paddingHorizontal: 16,
    },
    firstSectionTitle: { marginTop: 12 },
    group: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 16,
      paddingVertical: 14,
    },
    rowDivider: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowCopy: { flex: 1, minWidth: 0, paddingRight: 4 },
    rowTitle: {
      color: colors.ink,
      fontSize: TYPE.heading.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.heading.letterSpacing,
      lineHeight: TYPE.heading.lineHeight,
    },
    rowTitleSelected: { color: colors.accent },
    rowDescription: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
      marginTop: 3,
    },
    rowAction: {
      color: colors.accent,
      fontSize: TYPE.body.fontSize,
      fontWeight: '600',
    },
    syncBlock: { paddingBottom: 14, paddingTop: 14 },
    syncHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statusList: { gap: 10, marginTop: 12 },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      minHeight: 22,
    },
    statusLabel: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
    },
    pressed: { opacity: 0.62 },
  });
