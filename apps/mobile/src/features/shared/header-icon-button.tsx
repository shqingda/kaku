import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { COLORS, HIT_SLOP } from '@/constants/design';

// Material Symbols glyphs keep ~17% padding inside the font em box, so the
// same point size renders visibly smaller on Android than on iOS.
const DEFAULT_ICON_SIZE = Platform.OS === 'android' ? 22 : 19;

export function HeaderIconButton({
  accessibilityHint,
  accessibilityLabel,
  icon,
  iconOffset,
  iconSize = DEFAULT_ICON_SIZE,
  iconWeight = 'semibold',
  onPress,
  variant = 'inline',
}: {
  accessibilityHint: string;
  accessibilityLabel: string;
  icon: ComponentProps<typeof SymbolView>['name'];
  iconOffset?: { x?: number; y?: number };
  iconSize?: number;
  iconWeight?: ComponentProps<typeof SymbolView>['weight'];
  onPress: () => void;
  variant?: 'inline' | 'floating';
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        // Android's boxShadow paints via BlurMaskFilter, which hardware
        // acceleration may silently drop into a hard blob. It reads fine
        // over busy cover art, so floating pills keep it; nav-bar pills on
        // Android stay flat instead. iOS and web always get the chrome.
        (variant === 'floating' || Platform.OS !== 'android') &&
          styles.chrome,
        pressed && styles.pressed,
      ]}
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
    // Opaque white: a translucent fill lets the shadow bleed through and
    // tint the pill edges darker than its center.
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chrome: {
    borderColor: 'rgba(29, 29, 31, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  pressed: { opacity: 0.62, transform: [{ scale: 0.96 }] },
});
