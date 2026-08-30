import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { HIT_SLOP } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';

// 可点击的导航栏标题：点击导航栏任意位置（左右按钮除外）回到当前列表
// 顶部。组件撑满标题容器，并用水平 hitSlop 把按钮两侧的空白也纳入
// 触达范围；按钮自身的响应优先级更高，不受影响。
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
      hitSlop={{ bottom: 8, left: 140, right: 140, top: 8 }}
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
    alignItems: Platform.OS === 'android' ? 'flex-start' : 'center',
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: Platform.OS === 'android' ? 20 : 17,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
  },
});
