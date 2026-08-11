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
        size={15}
        tintColor={COLORS.ink}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderCurve: 'continuous',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressed: { opacity: 0.56 },
});
