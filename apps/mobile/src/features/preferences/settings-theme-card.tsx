import { Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ThemeColors } from '@/constants/theme';
import { playSelectionHaptic } from '@/lib/haptics';
import type { ThemePreference } from './preferences-model';
import type { SettingsStyles } from './settings-styles';

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

export function SettingsThemeCard({ theme, onSelect, colors, styles }: {
  theme: ThemePreference;
  onSelect: (theme: ThemePreference) => void;
  colors: ThemeColors;
  styles: SettingsStyles;
}) {
  return (
    <View style={styles.group}>
      {THEME_OPTIONS.map((option, index) => {
        const isSelected = theme === option.value;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            key={option.value}
            onPress={() => {
              if (isSelected) return;
              playSelectionHaptic();
              onSelect(option.value);
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
  );
}
