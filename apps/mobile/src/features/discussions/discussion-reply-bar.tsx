import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

// 列表底部预留：顶 8 + 按钮 48 + 底 10，再加一点滚动空隙。
export const DISCUSSION_REPLY_BAR_RESERVE = 88;

export function DiscussionReplyBar({
  accessibilityLabel,
  disabled,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View pointerEvents="box-none" style={styles.bar}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={HIT_SLOP}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{
            android: 'chat_bubble_outline',
            ios: 'bubble.left',
            web: 'chat_bubble_outline',
          }}
          size={17}
          tintColor={colors.muted}
        />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.background,
      bottom: 0,
      elevation: Platform.OS === 'android' ? 12 : 0,
      left: 0,
      paddingBottom: 10,
      paddingHorizontal: 20,
      paddingTop: 8,
      position: 'absolute',
      right: 0,
      zIndex: 20,
    },
    button: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.inputBorder,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 9,
      minHeight: 48,
      paddingHorizontal: 17,
    },
    label: { color: colors.muted, flexShrink: 1, fontSize: 14 },
    pressed: { opacity: 0.62 },
  });
