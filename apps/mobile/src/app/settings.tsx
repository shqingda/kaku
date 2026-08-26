import { useMemo } from 'react';
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
  const syncError =
    cloudError || searchHistory.cloudError || recentSubjects.cloudError;

  function retryFailedSync() {
    if (cloudError) void retryCloudSync();
    if (searchHistory.cloudError) void searchHistory.retryCloudSync();
    if (recentSubjects.cloudError) void recentSubjects.retryCloudSync();
  }

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
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>云同步</Text>
                <Text style={styles.rowDescription}>
                  {!cloudSyncAvailable
                    ? 'Kaku 云同步服务暂时关闭，本机设置不受影响。'
                    : !preferences.syncEnabled
                      ? '已关闭，外观、搜索和浏览只保存在本机。'
                      : syncing
                        ? '正在同步到其他设备…'
                        : '外观、最近搜索和浏览会同步到你的其他设备。'}
                </Text>
              </View>
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
          ) : (
            <Pressable
              accessibilityLabel="前往登录"
              accessibilityRole="button"
              onPress={() => router.push('/account')}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>设备间同步</Text>
                <Text style={styles.rowDescription}>
                  登录后即可在你的设备之间同步外观、搜索和浏览。
                </Text>
              </View>
              <Text style={styles.rowAction}>去登录</Text>
            </Pressable>
          )}
          {session && syncError ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              onPress={retryFailedSync}
              style={({ pressed }) => [
                styles.retryRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>上次同步失败，点此重试</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.groupFooter}>
          最近搜索最多保留 8 条，最近浏览最多 10 条。可在对应页面或清理本地数据时清除。
        </Text>
      </ScrollView>
    </SafeAreaView>
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
      overflow: 'hidden',
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
    retryRow: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingVertical: 14,
    },
    retryText: {
      color: colors.accent,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
      lineHeight: TYPE.caption.lineHeight,
    },
    groupFooter: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: 20,
      marginTop: 8,
      paddingHorizontal: 16,
    },
    pressed: { opacity: 0.62 },
  });
