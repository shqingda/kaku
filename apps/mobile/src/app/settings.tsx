import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
            syncing ? (
              <View style={styles.syncRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.syncText}>正在同步偏好…</Text>
              </View>
            ) : cloudError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void retryCloudSync()}
                style={({ pressed }) => [
                  styles.syncRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.syncError}>{cloudError}</Text>
                <Text style={styles.syncRetry}>点此重试</Text>
              </Pressable>
            ) : (
              <Text style={styles.syncText}>
                外观偏好保存在本机，并自动同步到你的其他设备。
              </Text>
            )
          ) : (
            <Text style={styles.syncText}>
              登录 Kaku 后，外观偏好会在你的设备之间同步。
            </Text>
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
    gap: 10,
    minHeight: 64,
  },
  syncText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  syncError: { color: colors.accent, flex: 1, fontSize: 13, lineHeight: 19 },
  syncRetry: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
