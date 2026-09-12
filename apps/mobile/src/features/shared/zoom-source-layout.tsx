import { Fragment, useRef, type ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iOS 26 的 native stack 会给「有 header 的屏幕」包一层 RNSSafeAreaView。
// AppleZoom 从有 header 的页跳到 headerShown:false 的条目详情再返回时，
// 这层 inset 会晚一拍才恢复，整页先靠上再下移。headerTransparent 让屏幕
// 始终全幅，inset 不再跟 nav bar 显隐绑在一起；顶部空位用冻结的 header
// 高度自己垫，视觉与不透明 header 一致。
const FALLBACK_BAR_HEIGHT = 44;

export const zoomSourceScreenOptions =
  Platform.OS === 'ios'
    ? {
        headerShadowVisible: false,
        headerTransparent: true,
        scrollEdgeEffects: {
          bottom: 'hidden' as const,
          left: 'hidden' as const,
          right: 'hidden' as const,
          top: 'hidden' as const,
        },
      }
    : {};

export const zoomSourceScrollProps =
  Platform.OS === 'ios'
    ? {
        automaticallyAdjustContentInsets: false as const,
        automaticallyAdjustsScrollIndicatorInsets: false as const,
        contentInsetAdjustmentBehavior: 'never' as const,
        scrollEventThrottle: 16,
        style: { flex: 1 },
      }
    : {};

export function useFrozenHeaderHeight() {
  const insets = useSafeAreaInsets();
  const fallback = insets.top + FALLBACK_BAR_HEIGHT;
  const live = useHeaderHeight();
  const frozen = useRef(live > 0 ? live : fallback);
  if (live > insets.top) {
    frozen.current = live;
  }
  return frozen.current;
}

export function ZoomSourceChrome({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const headerHeight = useFrozenHeaderHeight();
  if (Platform.OS !== 'ios') {
    return <Fragment>{children}</Fragment>;
  }
  return (
    <View style={[{ flex: 1, paddingTop: headerHeight }, style]}>
      {children}
    </View>
  );
}
