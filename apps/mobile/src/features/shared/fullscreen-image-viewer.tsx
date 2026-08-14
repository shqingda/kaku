import { useEffect, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  containedTranslation,
  DISMISS_HEIGHT_RATIO,
  resistedScale,
  RUBBERBAND_CONSTANT,
  settleScale,
  SHEET_DISMISS_SPRING,
  shouldDismissSheet,
  rubberband,
} from '@/lib/motion';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const MATERIALIZE_SPRING = { damping: 35, mass: 1, stiffness: 300 };
const ZOOM_SPRING = { damping: 28, mass: 1, stiffness: 300 };
const DOUBLE_TAP_SCALE = 2.5;
const AnimatedImage = Animated.createAnimatedComponent(Image);

// 以 contain 方式计算原图在容器内实际渲染的尺寸，缩放与约束都以它为基准。
function getFittedSize(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
) {
  const fit = Math.min(
    containerWidth / naturalWidth,
    containerHeight / naturalHeight,
  );
  return { height: naturalHeight * fit, width: naturalWidth * fit };
}

export function FullscreenImageViewer({
  onClose,
  title,
  url,
  visible,
}: {
  onClose: () => void;
  title: string;
  url?: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [isSaving, setIsSaving] = useState(false);
  const [containerSize, setContainerSize] = useState({ height: 0, width: 0 });
  const [naturalSize, setNaturalSize] = useState({ height: 0, width: 0 });
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const dismissOpacity = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const fitted =
    containerSize.width > 0 &&
    containerSize.height > 0 &&
    naturalSize.width > 0 &&
    naturalSize.height > 0
      ? getFittedSize(
          containerSize.width,
          containerSize.height,
          naturalSize.width,
          naturalSize.height,
        )
      : null;
  const halfWindowWidth = windowWidth / 2;
  const halfWindowHeight = windowHeight / 2;
  const dismissDistance = windowHeight * DISMISS_HEIGHT_RATIO;

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [mounted, visible]);

  // 打开：以材质入场代替纯淡入——轻微放缩 + 淡入；减少动态效果时退化为淡入。
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (reduceMotion) {
      progress.value = withTiming(1, { duration: 180 });
    } else {
      progress.value = withSpring(1, MATERIALIZE_SPRING);
    }
  }, [progress, reduceMotion, visible]);

  // 关闭：沿入场相反方向淡出（空间一致性）。
  useEffect(() => {
    if (visible || !mounted) {
      return;
    }
    progress.value = withTiming(
      0,
      { duration: 160 },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [mounted, progress, visible]);

  // 每次打开重置缩放与平移，避免上一次的查看状态残留。
  useEffect(() => {
    if (!visible) {
      return;
    }
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    dismissY.value = 0;
    dismissOpacity.value = 1;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [dismissOpacity, dismissY, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, visible]);

  const style = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: progress.value * dismissOpacity.value };
    }
    return {
      opacity: progress.value * dismissOpacity.value,
      transform: [{ scale: 0.96 + 0.04 * progress.value }],
    };
  });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dismissY.value },
      { scale: scale.value },
    ],
  }));

  const pinch = Gesture.Pinch()
    .enabled(!reduceMotion && fitted !== null)
    .onStart(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      // 焦点相对窗口中心的坐标；中心为缩放原点。
      const focalX = event.focalX - halfWindowWidth;
      const focalY = event.focalY - halfWindowHeight;
      scale.value = resistedScale(savedScale.value * event.scale);
      // 保持手指下方的内容不动：以手势焦点为原点的 1:1 跟随。
      const ratio = scale.value / savedScale.value;
      translateX.value = focalX - (focalX - savedTranslateX.value) * ratio;
      translateY.value = focalY - (focalY - savedTranslateY.value) * ratio;
    })
    .onEnd(() => {
      const target = settleScale(scale.value);
      const fittedWidth = fitted?.width ?? 0;
      const fittedHeight = fitted?.height ?? 0;
      scale.value = withSpring(target, {
        ...ZOOM_SPRING,
        overshootClamping: target > 1,
      });
      translateX.value = containedTranslation(
        translateX.value,
        fittedWidth,
        fittedWidth,
        target,
      );
      translateY.value = containedTranslation(
        translateY.value,
        fittedHeight,
        fittedHeight,
        target,
      );
    });

  const pan = Gesture.Pan()
    .enabled(!reduceMotion)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.01) {
        // 未缩放时，向下拖拽用于关闭预览；其余方向忽略。
        if (event.translationY <= 0) {
          dismissY.value = 0;
          dismissOpacity.value = 1;
          return;
        }
        const distance = rubberband(
          event.translationY,
          windowHeight,
          RUBBERBAND_CONSTANT,
        );
        dismissY.value = distance;
        dismissOpacity.value = Math.max(
          0,
          1 - distance / (windowHeight * 0.5),
        );
        return;
      }
      const fittedWidth = fitted?.width ?? 0;
      const fittedHeight = fitted?.height ?? 0;
      translateX.value = containedTranslation(
        savedTranslateX.value + event.translationX,
        fittedWidth,
        fittedWidth,
        scale.value,
      );
      translateY.value = containedTranslation(
        savedTranslateY.value + event.translationY,
        fittedHeight,
        fittedHeight,
        scale.value,
      );
    })
    .onEnd((event) => {
      if (scale.value > 1.01) {
        return;
      }
      if (shouldDismissSheet(dismissY.value, event.velocityY, dismissDistance)) {
        dismissY.value = withTiming(windowHeight, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        dismissOpacity.value = withTiming(0, { duration: 220 });
        return;
      }
      dismissY.value = withSpring(0, SHEET_DISMISS_SPRING);
      dismissOpacity.value = withTiming(1, { duration: 160 });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!reduceMotion && fitted !== null)
    .onStart((event) => {
      if (scale.value > 1.01) {
        // 已放大：回到 1x。
        scale.value = withSpring(1, ZOOM_SPRING);
        translateX.value = withSpring(0, ZOOM_SPRING);
        translateY.value = withSpring(0, ZOOM_SPRING);
        return;
      }
      // 以双击点为原点放大：该点下的内容位置保持不变。
      const focalX = event.x - halfWindowWidth;
      const focalY = event.y - halfWindowHeight;
      scale.value = withSpring(DOUBLE_TAP_SCALE, ZOOM_SPRING);
      translateX.value = withSpring(
        containedTranslation(
          focalX * (1 - DOUBLE_TAP_SCALE),
          fitted?.width ?? 0,
          fitted?.width ?? 0,
          DOUBLE_TAP_SCALE,
        ),
        ZOOM_SPRING,
      );
      translateY.value = withSpring(
        containedTranslation(
          focalY * (1 - DOUBLE_TAP_SCALE),
          fitted?.height ?? 0,
          fitted?.height ?? 0,
          DOUBLE_TAP_SCALE,
        ),
        ZOOM_SPRING,
      );
    });

  const zoomGestures = Gesture.Simultaneous(pinch, pan, doubleTap);

  async function saveImage() {
    if (!url || isSaving) return;

    setIsSaving(true);

    try {
      const permission = await requestPermissionsAsync(true, ['photo']);

      if (!permission.granted) {
        Alert.alert('无法保存图片', '请在系统设置中允许 Kaku 添加照片。');
        return;
      }

      const extension =
        url.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1]?.toLowerCase() ??
        'jpg';
      const file = new File(
        Paths.cache,
        `kaku-image-${Date.now()}.${extension}`,
      );
      const downloaded = await File.downloadFileAsync(url, file);

      await Asset.create(downloaded.uri);
      Alert.alert('已保存', '图片已保存到系统相册。');
    } catch {
      Alert.alert('图片保存失败', '图片服务暂时没有响应，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={mounted}
    >
      <GestureHandlerRootView style={styles.screen}>
        <GestureDetector gesture={zoomGestures}>
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[styles.screen, style]}
          >
          <View
            onLayout={(event) => {
              const next = event.nativeEvent.layout;
              setContainerSize({ height: next.height, width: next.width });
            }}
            style={styles.image}
          >
            {url ? (
              <AnimatedImage
                accessibilityLabel={`${title}图片`}
                contentFit="fill"
                onLoad={(event) => {
                  const source = event.source;
                  if (source.width && source.height) {
                    setNaturalSize({
                      height: source.height,
                      width: source.width,
                    });
                  }
                }}
                source={url}
                style={[
                  fitted
                    ? {
                        height: fitted.height,
                        width: fitted.width,
                      }
                    : StyleSheet.absoluteFill,
                  imageStyle,
                ]}
              />
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="关闭图片预览"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [
              styles.close,
              { top: insets.top + 10 },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ android: 'close', ios: 'xmark', web: 'close' }}
              size={17}
              tintColor="#FFFFFF"
              weight="semibold"
            />
          </Pressable>
          <Pressable
            accessibilityLabel="下载图片"
            accessibilityRole="button"
            disabled={isSaving || !url}
            onPress={() => void saveImage()}
            style={({ pressed }) => [
              styles.download,
              { bottom: insets.bottom + 22 },
              (pressed || isSaving) && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SymbolView
                name={{
                  android: 'download',
                  ios: 'arrow.down.to.line',
                  web: 'download',
                }}
                size={17}
                tintColor="#FFFFFF"
                weight="semibold"
              />
            )}
            <Text style={styles.downloadText}>
              {isSaving ? '保存中' : '下载'}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1 },
  image: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
    marginVertical: 72,
    overflow: 'hidden',
  },
  close: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 38, 40, 0.78)',
    borderCurve: 'continuous',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 40,
  },
  download: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(38, 38, 40, 0.86)',
    borderCurve: 'continuous',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  downloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
