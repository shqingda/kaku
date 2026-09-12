import { useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from 'expo-router';

// AppleZoom（expo zoom 转场）pop 时，系统会在转场过程中调整源屏幕
// ScrollView 的 contentOffset（把缩回的卡片对齐到详情页位置），JS 侧若
// 不干预，页面会先停在偏移后的位置、等到下一次渲染才跳回——即「返回后
// 先错位、约一秒后恢复」。
// 处理：离开屏幕（push 开始）瞬间冻结当时的偏移；转场真正结束
// （transitionEnd 且非 closing）后立即把冻结值恢复给原生滚动视图。
// 转场期间系统产生的滚动事件不会污染冻结值；位置本来就正确时
// scrollTo 是无操作，转场手感不受影响。
export function useRestoreScrollOnFocus(scrollRef: {
  current: {
    scrollTo: (options: { animated: boolean; y: number }) => void;
  } | null;
}) {
  // transitionEnd 事件在泛型 EventMap 之外，这里按事件名订阅。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const offsetRef = useRef(0);
  const frozenOffsetRef = useRef(0);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const restore = () => {
        scrollRef.current?.scrollTo({
          animated: false,
          y: Math.max(0, frozenOffsetRef.current),
        });
      };
      const unsubscribe = navigation.addListener(
        'transitionEnd',
        (event: { data?: { closing?: boolean } }) => {
          // closing = 本屏幕正在关闭（push 走向详情），只在回到本屏时恢复。
          if (event.data?.closing) {
            return;
          }
          restore();
        },
      );
      return () => {
        // blur：正在 push 进详情，冻结进入时的位置。
        frozenOffsetRef.current = offsetRef.current;
        unsubscribe();
      };
    }, [navigation, scrollRef]),
  );

  return { handleScroll };
}
