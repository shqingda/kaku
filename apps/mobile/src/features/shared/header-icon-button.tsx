import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COLORS, HIT_SLOP } from '@/constants/design';

export function HeaderIconButton({
  accessibilityHint,
  accessibilityLabel,
  icon,
  iconOffset,
  iconSize = 19,
  iconWeight = 'semibold',
  onPress,
}: {
  accessibilityHint: string;
  accessibilityLabel: string;
  icon: ComponentProps<typeof SymbolView>['name'];
  iconOffset?: { x?: number; y?: number };
  iconSize?: number;
  iconWeight?: ComponentProps<typeof SymbolView>['weight'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View
        style={
          iconOffset
            ? {
                transform: [
                  { translateX: iconOffset.x ?? 0 },
                  { translateY: iconOffset.y ?? 0 },
                ],
              }
            : undefined
        }
      >
        <SymbolView
          name={icon}
          size={iconSize}
          tintColor={COLORS.ink}
          weight={iconWeight}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(29, 29, 31, 0.06)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 40,
  },
  pressed: { opacity: 0.62, transform: [{ scale: 0.96 }] },
});
