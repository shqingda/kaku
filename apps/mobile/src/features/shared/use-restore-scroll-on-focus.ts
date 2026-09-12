import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';

// AppleZoom pop 时，系统会改源屏幕 ScrollView 的 contentOffset（把缩回的
// 封面对齐到详情页落点）。JS 若只在 transitionEnd 里 scrollTo 一次，经常
// 赶不上：zoom 可能不发这个事件，或发完之后原生还会再改一帧。
//
// 处理：离开时冻结偏移；回到本屏后进入一小段守卫窗口，期间任何偏离冻结
// 值的滚动立刻拨回去。位置本来就对时 scrollTo 是无操作。
const GUARD_MS = 900;
const FALLBACK_RESTORE_MS = 420;
const OFFSET_EPSILON = 0.5;

type Scrollable = {
  scrollTo: (options: { animated: boolean; y: number }) => void;
};

export function useRestoreScrollOnFocus(scrollRef: {
  current: Scrollable | null;
}) {
  // transitionStart / transitionEnd 不在默认 EventMap 里。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const offsetRef = useRef(0);
  const frozenOffsetRef = useRef(0);
  const pendingRestoreRef = useRef(false);
  const guardUntilRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forceScrollTo = useCallback(
    (y: number) => {
      const node = scrollRef.current;
      if (!node) return;
      const target = Math.max(0, y);
      // JS 侧若认为已经在 target，部分架构会把 scrollTo 优化成空操作，
      // 先拨 0.01 再拨回去，强制走到原生。
      node.scrollTo({ animated: false, y: target + 0.01 });
      node.scrollTo({ animated: false, y: target });
    },
    [scrollRef],
  );

  const restore = useCallback(() => {
    forceScrollTo(frozenOffsetRef.current);
  }, [forceScrollTo]);

  const beginGuard = useCallback(() => {
    if (!pendingRestoreRef.current) return;
    pendingRestoreRef.current = false;
    guardUntilRef.current = Date.now() + GUARD_MS;
    restore();
    requestAnimationFrame(restore);
  }, [restore]);

  const freezeCurrentOffset = useCallback(() => {
    if (pendingRestoreRef.current) return;
    frozenOffsetRef.current = offsetRef.current;
    pendingRestoreRef.current = true;
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      const guarding = Date.now() < guardUntilRef.current;
      if (pendingRestoreRef.current || guarding) {
        // 离开后到守卫结束前，系统改偏移不能写进冻结值。
        // 只在回到本屏的守卫窗口里拨回去，转场过程中不去抢 zoom 对齐。
        if (guarding && Math.abs(y - frozenOffsetRef.current) > OFFSET_EPSILON) {
          restore();
        }
        return;
      }
      offsetRef.current = y;
    },
    [restore],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const onStart = (event: { data?: { closing?: boolean } }) => {
      if (event.data?.closing) {
        freezeCurrentOffset();
        return;
      }
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      // zoom 有时不发 transitionEnd，按常见转场时长兜底。
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        beginGuard();
      }, FALLBACK_RESTORE_MS);
    };

    const onEnd = (event: { data?: { closing?: boolean } }) => {
      if (event.data?.closing) return;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      beginGuard();
    };

    const unsubStart = navigation.addListener('transitionStart', onStart);
    const unsubEnd = navigation.addListener('transitionEnd', onEnd);

    return () => {
      unsubStart();
      unsubEnd();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [beginGuard, freezeCurrentOffset, navigation]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // blur 时再冻一次：有的 zoom push 不走 transitionStart。
        freezeCurrentOffset();
      };
    }, [freezeCurrentOffset]),
  );

  return { handleScroll };
}
