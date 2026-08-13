import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';

// 讨论页的悬浮"写回复"按钮（Apple Mail 风格）：右下角圆形强调色按钮，
// 替代原先占满整行、像禁用输入框的底部条，作为明确、可发现的操作入口。
export function DiscussionComposeButton({
  accessibilityLabel,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: insets.bottom + 16 }]}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{
            android: 'edit',
            ios: 'square.and.pencil',
            web: 'edit',
          }}
          size={21}
          tintColor={COLORS.surface}
          weight="semibold"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 28,
    elevation: Platform.OS === 'android' ? 6 : 0,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    width: 56,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.95 }] },
});
