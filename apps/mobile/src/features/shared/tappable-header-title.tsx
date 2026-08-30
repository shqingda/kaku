import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { HIT_SLOP } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';

// 可点击的导航栏标题：点击回到当前列表顶部（iOS 惯例的列表快捷导航）。
// 字号字重对齐原生栈导航栏默认样式。
export function TappableHeaderTitle({
  onPress,
  title,
}: {
  onPress: () => void;
  title: string;
}) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityHint="回到当前列表顶部"
      accessibilityLabel={`回到${title}顶部`}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.title, pressed && styles.pressed]}
    >
      <Text
        numberOfLines={1}
        style={[styles.titleText, { color: colors.ink }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  title: {
    // 占满标题区，让整个标题范围都可以点。
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: Platform.OS === 'android' ? 20 : 17,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
  },
});
