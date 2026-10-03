import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SPACING } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import {
  DISMISS_HEIGHT_RATIO,
  RUBBERBAND_CONSTANT,
  SHEET_DISMISS_SPRING,
  SHEET_ENTER_SPRING,
  rubberband,
  shouldDismissSheet,
} from '@/lib/motion';
import { useReduceMotion } from '@/lib/use-reduce-motion';

// 底部弹层：进入/退出沿同一路径滑下，可被拖拽与反拉打断（interruptibility），
// 释放时按动量投影决定关闭还是弹回（velocity handoff + momentum projection），
// 向上拖出展开位时按橡皮筋逐渐抵抗。减少动态效果时退化为不透明度过渡。
// header：标题行插槽，渲染在下拖手势区内（把手下方），让「按住标题拖动」
// 成为关闭路径的一部分；内部按钮的点按不受影响（Pan 按位移激活，轻点不算）。
export function AppSheet({
  children,
  header,
  keyboardAvoidingBehavior = 'padding',
  onClose,
  onEntered,
  onShow,
  swipeToDismissEnabled = true,
  visible,
}: {
  children: ReactNode;
  header?: ReactNode;
  keyboardAvoidingBehavior?: 'height' | 'padding' | 'position' | undefined;
  onClose: () => void;
  onEntered?: () => void;
  onShow?: () => void;
  swipeToDismissEnabled?: boolean;
  visible: boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const colors = useTheme();
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(windowHeight);
  const dragStart = useSharedValue({ offset: 0, translation: 0 });
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const mountedRef = useRef(mounted);
  const onEnteredRef = useRef(onEntered);
  const hasEnteredRef = useRef(false);
  const finishEntering = useCallback(() => {
    if (!hasEnteredRef.current) {
      hasEnteredRef.current = true;
      onEnteredRef.current?.();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  useEffect(() => {
    onEnteredRef.current = onEntered;
  }, [onEntered]);

  // 打开：重置到展开位，再从屏幕下方以临界阻尼弹簧滑入。
  useEffect(() => {
    if (!visible) {
      hasEnteredRef.current = false;
      return;
    }

    translateY.value = windowHeight;
    backdropOpacity.value = 0;

    if (reduceMotion) {
      translateY.value = 0;
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(finishEntering)();
      });
    } else {
      translateY.value = withSpring(0, SHEET_ENTER_SPRING, (finished) => {
        if (finished) runOnJS(finishEntering)();
      });
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [backdropOpacity, finishEntering, reduceMotion, translateY, visible, windowHeight]);

  // 关闭：沿进入的同一条路径滑回屏幕下方（空间一致性）。
  useEffect(() => {
    if (visible || !mountedRef.current) {
      return;
    }

    if (reduceMotion) {
      backdropOpacity.value = withTiming(
        0,
        { duration: 180, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
      return;
    }

    translateY.value = withSpring(windowHeight, SHEET_DISMISS_SPRING, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
    backdropOpacity.value = withTiming(0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [backdropOpacity, reduceMotion, translateY, visible, windowHeight]);

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [mounted, visible]);

  // 关闭阈值基于弹层自身高度而不是整屏高度：小弹层拖一小段即可关闭。
  const dismissDistance = Math.max(
    sheetHeight * DISMISS_HEIGHT_RATIO,
    windowHeight * 0.2,
  );

  const pan = Gesture.Pan()
    .enabled(!reduceMotion && swipeToDismissEnabled)
    // 纵向位移超过阈值才激活，横向明显移动即判失败：
    // 标题行里的按钮保持可点，横向滑动不会误触发下拖。
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onStart((event) => {
      // 只有真正开始拖动才接管动画，轻点标题不会让入场或回弹停住。
      cancelAnimation(translateY);
      const position = translateY.value;
      // 反解橡皮筋，避免再次抓住向上回弹的弹层时重复压缩当前位置。
      const offset = position < 0
        ? (position * dismissDistance) /
          (RUBBERBAND_CONSTANT * Math.max(1, dismissDistance + position))
        : position;
      dragStart.value = { offset, translation: event.translationY };
    })
    .onUpdate((event) => {
      const distance = dragStart.value.offset + event.translationY - dragStart.value.translation;
      if (distance < 0) {
        // 向上超出展开位：橡皮筋，逐渐抵抗而不是硬停。
        translateY.value = -rubberband(
          -distance,
          dismissDistance,
          RUBBERBAND_CONSTANT,
        );
      } else {
        translateY.value = distance;
      }
    })
    .onEnd((event, success) => {
      const dismiss = success && translateY.value > 0 &&
        shouldDismissSheet(translateY.value, event.velocityY, dismissDistance);
      // 正常释放交接真实速度；被系统取消的拖动平稳归位，不意外关闭。
      translateY.value = withSpring(
        dismiss ? windowHeight : 0,
        { ...SHEET_DISMISS_SPRING, velocity: success ? event.velocityY : 0 },
        (finished) => {
          if (!finished) return;
          if (dismiss) runOnJS(onClose)();
          else runOnJS(finishEntering)();
        },
      );
    });

  // 拖得越远遮罩越淡；减少动态效果时遮罩只跟随淡入淡出。
  const backdropStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: backdropOpacity.value };
    }
    return {
      opacity: Math.max(
        0,
        backdropOpacity.value - (translateY.value / dismissDistance) * 0.55,
      ),
    };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Let the native Modal own accessibility isolation. Marking its descendants
  // as modal regions can leave the AX tree empty after reopening on iOS.
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      onShow={onShow}
      transparent
      visible={mounted}
    >
      <GestureHandlerRootView style={styles.container}>
        <KeyboardAvoidingView
          behavior={keyboardAvoidingBehavior}
          onAccessibilityEscape={onClose}
          style={styles.container}
        >
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.backdrop, backdropStyle]}
        >
          <Pressable
            accessibilityLabel="关闭"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          onAccessibilityEscape={onClose}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (Math.abs(nextHeight - sheetHeight) > 1) {
              setSheetHeight(nextHeight);
            }
          }}
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.sheet, sheetStyle, { backgroundColor: colors.surface }]}
        >
          {/* 拖拽手势挂在把手与 header 插槽上：若包住整个弹层，Android 上
              会抢走内部 ScrollView/FlatList 的滚动，导致列表无法滚动。 */}
          <GestureDetector gesture={pan}>
            <View>
              <View style={styles.dragZone}>
                <View style={[styles.handle, { backgroundColor: colors.track }]} />
              </View>
              {header}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg + SPACING.xs,
    paddingTop: SPACING.xs / 2,
  },
  dragZone: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  handle: {
    borderRadius: 2,
    height: 4,
    width: 36,
  },
});
