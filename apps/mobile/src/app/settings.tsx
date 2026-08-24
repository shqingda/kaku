import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
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
  const { cloudError, preferences, retryCloudSync, setTheme, syncing } =
    usePreferences();

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>外观</Text>
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
                  styles.optionRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.optionCopy}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>
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
                    weight="bold"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>偏好同步</Text>
        <View style={styles.group}>
          {session ? (
            <>
              <View style={styles.syncRow}>
                {syncing ? (
                  <View style={styles.syncIcon}>
                    <ActivityIndicator color={colors.accent} size="small" />
                  </View>
                ) : (
                  <SymbolView
                    name={
                      cloudError
                        ? {
                            android: 'error',
                            ios: 'exclamationmark.triangle.fill',
                            web: 'error',
                          }
                        : {
                            android: 'check_circle',
                            ios: 'checkmark.circle.fill',
                            web: 'check_circle',
                          }
                    }
                    size={20}
                    tintColor={cloudError ? colors.accent : colors.accentRich}
                    weight="semibold"
                  />
                )}
                <View style={styles.syncCopy}>
                  <Text style={styles.syncTitle}>云同步</Text>
                  <Text style={styles.syncDescription}>
                    {syncing
                      ? '正在同步偏好…'
                      : cloudError
                        ? '同步没有完成，更改仍保存在本机。'
                        : '已开启，外观偏好会自动同步到你的其他设备。'}
                  </Text>
                </View>
                {cloudError && !syncing ? (
                  <Pressable
                    accessibilityLabel="重试偏好同步"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => void retryCloudSync()}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.syncRetry}>重试</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.rowDivider} />
              <Text style={styles.explainText}>
                更改外观后会先保存在本机，随后在后台同步到云端。
              </Text>
            </>
          ) : (
            <>
              <View style={styles.syncRow}>
                <SymbolView
                  name={{
                    android: 'cloud',
                    ios: 'icloud',
                    web: 'cloud',
                  }}
                  size={20}
                  tintColor={colors.subtle}
                  weight="semibold"
                />
                <View style={styles.syncCopy}>
                  <Text style={styles.syncTitle}>设备间同步</Text>
                  <Text style={styles.syncDescription}>
                    登录后，外观偏好会在你的设备之间同步。
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="前往登录"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push('/account')}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.syncRetry}>去登录</Text>
                </Pressable>
              </View>
              <View style={styles.rowDivider} />
              <Text style={styles.explainText}>
                仅同步设置偏好，不会上传搜索历史或浏览记录。
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 24 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 68,
  },
  rowDivider: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionCopy: { flex: 1, paddingRight: 12 },
  optionLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  optionLabelSelected: { color: colors.accent },
  optionDescription: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  syncRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 68,
  },
  syncIcon: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  syncCopy: { flex: 1 },
  syncTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  syncDescription: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  syncRetry: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  explainText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.62 },
});
