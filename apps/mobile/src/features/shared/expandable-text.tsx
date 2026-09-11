import { useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/use-reduce-motion';
import { playSelectionHaptic } from '@/lib/haptics';

// 与 changelog 卡片同一套弹簧展开：进度 0（收起）到 1（展开），
// 高度始终从当前值出发、随时可反向；完整文本常驻渲染并测量，
// 收起态用高度裁切而非 numberOfLines（无省略号，与 changelog 一致）。
const EXPAND_SPRING = { damping: 35, mass: 1, stiffness: 300 } as const;

export function ExpandableText({
  collapsedLines = 3,
  collapseLabel = '收起',
  expandLabel = '展开',
  // a11y 播报要具体（如「展开简介」），按钮可见文字只有「展开/收起」。
  noun,
  style,
  text,
  toggleLabelStyle,
}: {
  collapsedLines?: number;
  collapseLabel?: string;
  expandLabel?: string;
  noun?: string;
  style?: StyleProp<TextStyle>;
  text: string;
  toggleLabelStyle?: StyleProp<TextStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);
  const fullHeight = useSharedValue(0);
  const flatStyle = StyleSheet.flatten(style);
  const collapsedHeight =
    collapsedLines * (flatStyle?.lineHeight ?? 20);

  function toggle() {
    playSelectionHaptic();
    const next = !expanded;
    setExpanded(next);
    if (reduceMotion) {
      progress.value = next ? 1 : 0;
      return;
    }
    progress.value = withSpring(next ? 1 : 0, EXPAND_SPRING);
  }

  const bodyStyle = useAnimatedStyle(() => ({
    height:
      collapsedHeight + progress.value * (fullHeight.value - collapsedHeight),
  }));

  return (
    <View>
      <Animated.View style={[styles.clip, bodyStyle]}>
        <Text
          onLayout={(event) => {
            fullHeight.value = event.nativeEvent.layout.height;
          }}
          style={style}
        >
          {text}
        </Text>
      </Animated.View>
      <Pressable
        accessibilityLabel={`${expanded ? collapseLabel : expandLabel}${noun ?? ''}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={8}
        onPress={toggle}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={toggleLabelStyle}>
          {expanded ? collapseLabel : expandLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  pressed: { opacity: 0.62 },
});
