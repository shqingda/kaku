import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { COLORS } from '@/constants/design';

export function HeaderHomeButton() {
  return (
    <Pressable
      accessibilityLabel="回到首页"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.dismissTo('/')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ android: 'home', ios: 'house.fill', web: 'home' }}
        size={21}
        tintColor={COLORS.ink}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: { opacity: 0.56 },
});
