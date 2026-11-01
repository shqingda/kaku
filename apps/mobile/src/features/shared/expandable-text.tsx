import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextLayoutEvent,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/use-reduce-motion';
import { playSelectionHaptic } from '@/lib/haptics';
import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';

// 单独测量完整文本，避免裁切容器反过来限制测量高度。
// 动画直接更新当前高度，重定向时由 Reanimated 接续当前值与弹簧速度。
const EXPAND_SPRING = { damping: 35, mass: 1, stiffness: 300 } as const;

type MeasurementScope = {
  key: string;
};

type TextMeasurement = {
  scope: MeasurementScope;
  fullHeight?: number;
  lines?: TextLayoutEvent['nativeEvent']['lines'];
};

type TextBounds = {
  scope: MeasurementScope;
  fullHeight: number;
  collapsedHeight: number;
  canExpand: boolean;
};

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
  const { fontScale } = useWindowDimensions();
  const lineLimit = Math.max(1, Math.floor(collapsedLines));
  const [width, setWidth] = useState(0);
  const [expansion, setExpansion] = useState({ text, expanded: false });
  const expanded = expansion.text === text && expansion.expanded;
  const [bounds, setBounds] = useState<TextBounds | null>(null);
  const height = useSharedValue(0);
  const initialized = useRef(false);
  const mounted = useRef(true);
  const measurement = useRef<TextMeasurement | null>(null);
  const contentKey = JSON.stringify([text, lineLimit, fontScale, StyleSheet.flatten(style)]);
  const layoutKey = `${contentKey}:${width}`;
  const scope = useMemo(() => ({ key: layoutKey }), [layoutKey]);
  const currentScope = useRef<MeasurementScope | null>(scope);
  currentScope.current = scope;
  const currentBounds = bounds?.scope === scope ? bounds : null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setExpansion(previous => previous.text === text ? previous : { text, expanded: false });
  }, [text]);

  // 只在 JS 的原生布局事件中调用；旧文本、宽度和字号的事件不能覆盖新测量。
  function recordMeasurement(part: Omit<TextMeasurement, 'scope'>) {
    if (!mounted.current || currentScope.current !== scope) return;
    const next = {
      ...(measurement.current?.scope === scope ? measurement.current : { scope }),
      ...part,
    };
    measurement.current = next;
    if (next.fullHeight === undefined || !next.lines) return;
    const lastVisibleLine = next.lines[Math.min(lineLimit, next.lines.length) - 1];
    const collapsedHeight = next.lines.length <= lineLimit || !lastVisibleLine
      ? next.fullHeight
      : Math.min(next.fullHeight, lastVisibleLine.y + lastVisibleLine.height);
    const nextBounds = {
      scope,
      fullHeight: next.fullHeight,
      collapsedHeight,
      canExpand: next.lines.length > lineLimit && next.fullHeight > collapsedHeight,
    };
    if (!initialized.current) {
      height.value = collapsedHeight;
      initialized.current = true;
    }
    setBounds(previous => previous?.scope === scope
      && previous.fullHeight === nextBounds.fullHeight
      && previous.collapsedHeight === nextBounds.collapsedHeight
      && previous.canExpand === nextBounds.canExpand ? previous : nextBounds);
  }

  useEffect(() => {
    if (!currentBounds) return;
    const target = expanded ? currentBounds.fullHeight : currentBounds.collapsedHeight;
    height.value = reduceMotion ? target : withSpring(target, EXPAND_SPRING);
  }, [currentBounds, expanded, height, reduceMotion]);

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View
      onLayout={(event) => {
        if (!mounted.current || currentScope.current !== scope) return;
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth === width) return;
        currentScope.current = null;
        setWidth(nextWidth);
      }}
      testID="expandable-text-layout"
    >
      <Animated.View style={[styles.clip, bounds && bodyStyle]} testID="expandable-text-body">
        {/* 初次测量前由原生行数限制显示预览，不预估字号高度或先显示空白。 */}
        <Text numberOfLines={bounds ? undefined : lineLimit} style={[styles.text, style]}>
          {text}
        </Text>
      </Animated.View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.measurement}
      >
        <Text
          key={scope.key}
          onLayout={(event) => recordMeasurement({ fullHeight: event.nativeEvent.layout.height })}
          onTextLayout={(event) => recordMeasurement({ lines: event.nativeEvent.lines })}
          style={[styles.text, style]}
          testID="expandable-text-measurement"
        >
          {text}
        </Text>
      </View>
      {currentBounds?.canExpand ? (
        <Pressable
          accessibilityLabel={`${expanded ? collapseLabel : expandLabel}${noun ?? ''}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={HIT_SLOP}
          onPress={() => setExpansion({ text, expanded: !expanded })}
          onPressIn={() => void playSelectionHaptic()}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Text style={[styles.toggleLabel, toggleLabelStyle]}>
            {expanded ? collapseLabel : expandLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  text: { ...TYPE.body },
  measurement: { position: 'absolute', top: SPACING.none, left: SPACING.none, right: SPACING.none, opacity: 0 },
  toggle: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE },
  toggleLabel: { ...TYPE.caption },
  pressed: { opacity: 0.62 },
});
