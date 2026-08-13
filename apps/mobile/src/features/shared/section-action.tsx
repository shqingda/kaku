import { SymbolView } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { HIT_SLOP, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';

export function SectionAction({
  accessibilityHint,
  accessibilityLabel,
  color,
  label,
  onPress,
  style,
}: {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  color?: string;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const resolvedColor = color ?? colors.accent;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: resolvedColor }]}>{label}</Text>
      <SymbolView
        name={{
          android: 'chevron_right',
          ios: 'chevron.right',
          web: 'chevron_right',
        }}
        size={12}
        tintColor={resolvedColor}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 44,
  },
  label: {
    ...TYPE.caption,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 18,
  },
  pressed: { opacity: 0.62 },
});
