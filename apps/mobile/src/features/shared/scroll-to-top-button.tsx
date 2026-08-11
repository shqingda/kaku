import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { COLORS } from '@/constants/design';

export function ScrollToTopButton({
  onPress,
  visible,
}: {
  onPress: () => void;
  visible: boolean;
}) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: visible ? 160 : 120,
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel="回到顶部"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ android: 'arrow_upward', ios: 'arrow.up', web: 'arrow_upward' }}
          size={18}
          tintColor={COLORS.ink}
          weight="semibold"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 24,
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor:
      Platform.OS === 'android'
        ? 'rgba(29, 29, 31, 0.14)'
        : 'rgba(29, 29, 31, 0.08)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 44,
  },
  pressed: { opacity: 0.58 },
});
