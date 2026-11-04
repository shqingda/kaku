import { Image } from 'expo-image';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme, useThemeScheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { APP_ICONS, DEFAULT_APP_ICON, appIconPreview, type AppIconId } from './app-icon-catalog';
import type { AppIconStatus } from './use-app-icon';

const PREVIEW_SIZE = 52;
const RADIO_SIZE = 22;
const RADIO_DOT = 10;

export function AppIconPicker({ current, error, onSelect, pending, status }: {
  current: AppIconId | null;
  error: string | null;
  onSelect: (id: AppIconId) => void;
  pending: AppIconId | null;
  status: AppIconStatus;
}) {
  const colors = useTheme();
  const scheme = useThemeScheme();
  const styles = createStyles(colors);
  const disabled = status === 'unsupported' || status === 'applying';

  return (
    <View>
      <View style={styles.group}>
        {APP_ICONS.map((icon, index) => {
          const selected = current === icon.id;
          const applying = pending === icon.id;
          return (
            <Pressable
              accessibilityLabel={icon.id === DEFAULT_APP_ICON ? `${icon.label}，默认图标` : icon.label}
              accessibilityRole="radio"
              accessibilityState={{ busy: applying, checked: selected, disabled }}
              disabled={disabled}
              key={icon.id}
              onPressIn={() => {
                if (!selected) playSelectionHaptic();
              }}
              onPress={() => onSelect(icon.id)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.divider,
                pressed && !selected && styles.pressed,
                status === 'unsupported' && styles.unavailable,
              ]}
              testID={`app-icon-${icon.id}`}
            >
              <Image
                accessible={false}
                contentFit="cover"
                source={appIconPreview(icon.id, scheme === 'dark' ? 'dark' : 'light')}
                style={styles.preview}
              />
              <View style={styles.copy}>
                <Text style={styles.label}>{icon.label}</Text>
                {icon.id === DEFAULT_APP_ICON ? <Text style={styles.caption}>默认</Text> : null}
              </View>
              {applying ? (
                <ActivityIndicator color={colors.accent} style={styles.radio} />
              ) : (
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.note, styles.error]}>{error}</Text>
      ) : (
        <Text style={styles.note}>
          {Platform.OS === 'android'
            ? '切换后桌面图标可能需要几秒才会更新，部分桌面会把图标移回应用列表。'
            : '切换后系统会弹出提示，确认即可。'}
        </Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      paddingHorizontal: SPACING.lg,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.lg,
      minHeight: MIN_TOUCH_SIZE,
      paddingVertical: SPACING.md,
    },
    divider: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    pressed: { opacity: 0.62 },
    unavailable: { opacity: 0.5 },
    preview: {
      borderColor: colors.divider,
      borderCurve: 'continuous',
      borderRadius: PREVIEW_SIZE * 0.225,
      borderWidth: StyleSheet.hairlineWidth,
      height: PREVIEW_SIZE,
      width: PREVIEW_SIZE,
    },
    copy: { flex: 1, minWidth: 0 },
    label: {
      color: colors.ink,
      fontSize: TYPE.heading.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.heading.letterSpacing,
      lineHeight: TYPE.heading.lineHeight,
    },
    caption: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
    },
    radio: {
      alignItems: 'center',
      borderColor: colors.inputBorder,
      borderRadius: RADIO_SIZE / 2,
      borderWidth: 2,
      height: RADIO_SIZE,
      justifyContent: 'center',
      width: RADIO_SIZE,
    },
    radioSelected: { borderColor: colors.accent },
    radioDot: {
      backgroundColor: colors.accent,
      borderRadius: RADIO_DOT / 2,
      height: RADIO_DOT,
      width: RADIO_DOT,
    },
    note: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.lg,
    },
    error: { color: colors.accentRich },
  });
