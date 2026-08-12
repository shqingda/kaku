import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { COLORS } from '@/constants/design';

export function HeaderBackButton() {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.dismissTo('/');
  }

  return (
    <Pressable
      accessibilityLabel="返回"
      accessibilityRole="button"
      hitSlop={8}
      onPress={goBack}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ android: 'arrow_back', ios: 'chevron.left', web: 'arrow_back' }}
        size={19}
        tintColor={COLORS.ink}
        weight="semibold"
      />
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
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 40,
  },
  pressed: { opacity: 0.56 },
});
