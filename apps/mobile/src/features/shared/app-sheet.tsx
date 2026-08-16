import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
export function AppSheet({
  children,
  keyboardAvoidingBehavior = 'padding',
  onClose,
  onEntered,
  onShow,
  swipeToDismissEnabled = true,
  visible,
}: {
  children: ReactNode;
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
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const mountedRef = useRef(mounted);
  const onEnteredRef = useRef(onEntered);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  useEffect(() => {
    onEnteredRef.current = onEntered;
  }, [onEntered]);

  // 打开：重置到展开位，再从屏幕下方以临界阻尼弹簧滑入。
  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.value = windowHeight;
    backdropOpacity.value = 0;

    const finishEntering = (finished?: boolean) => {
      if (finished && onEnteredRef.current) {
        runOnJS(onEnteredRef.current)();
      }
    };

    if (reduceMotion) {
      translateY.value = 0;
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      }, finishEntering);
    } else {
      translateY.value = withSpring(0, SHEET_ENTER_SPRING, finishEntering);
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [backdropOpacity, reduceMotion, translateY, visible, windowHeight]);

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
    .onBegin(() => {
      cancelAnimation(translateY);
    })
    .onUpdate((event) => {
      if (event.translationY < 0) {
        // 向上超出展开位：橡皮筋，逐渐抵抗而不是硬停。
        translateY.value = -rubberband(
          -event.translationY,
          dismissDistance,
          RUBBERBAND_CONSTANT,
        );
      } else {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const distance = event.translationY;

      if (distance <= 0) {
        translateY.value = withSpring(0, SHEET_ENTER_SPRING);
        return;
      }

      if (shouldDismissSheet(distance, event.velocityY, dismissDistance)) {
        // 甩动关闭：以手指速度继续减速滑动（速度交接），到位后收起。
        translateY.value = withDecay(
          {
            deceleration: 0.997,
            velocity: Math.max(event.velocityY, 600),
          },
          (finished) => {
            if (!finished) return;
            if (translateY.value < dismissDistance) {
              // 投影与判定一致，正常情况下不会走到这里；兜底滑完剩余距离。
              translateY.value = withSpring(windowHeight, SHEET_DISMISS_SPRING);
              return;
            }
            runOnJS(onClose)();
          },
        );
      } else {
        // 未够关闭条件：以带轻微回弹的弹簧弹回（拖动本身带有动量）。
        translateY.value = withSpring(0, SHEET_DISMISS_SPRING);
      }
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
          accessibilityViewIsModal
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
          accessibilityViewIsModal
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
          {/* 拖拽手势只挂在把手上：若包住整个弹层，Android 上会抢走
              内部 ScrollView/FlatList 的滚动，导致列表无法滚动。 */}
          <GestureDetector gesture={pan}>
            <View style={styles.dragZone}>
              <View style={[styles.handle, { backgroundColor: colors.track }]} />
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
    paddingHorizontal: 20,
    paddingTop: 2,
  },
  dragZone: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    borderRadius: 2,
    height: 4,
    width: 36,
  },
});
