import { useCallback, useRef, useState } from 'react';

const SHOW_THRESHOLD = 720;

type ScrollTarget =
  | { scrollToOffset: (options: { animated: boolean; offset: number }) => void }
  | { scrollTo: (options: { animated: boolean; y: number }) => void };

export function useScrollToTopButton<T extends ScrollTarget>(
  externalRef?: { current: T | null },
) {
  const internalRef = useRef<T>(null);
  // 传进来的列表 ref 优先（讨论类页面已有 useReplyNavigation 持有的 ref）。
  const ref = externalRef ?? internalRef;
  const [visible, setVisible] = useState(false);
  // 值未变化时直接跳过 setState，滚动事件不再触发多余渲染调度。
  const visibleRef = useRef(false);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const nextVisible = event.nativeEvent.contentOffset.y > SHOW_THRESHOLD;
      if (visibleRef.current === nextVisible) {
        return;
      }
      visibleRef.current = nextVisible;
      setVisible(nextVisible);
    },
    [],
  );

  const scrollToTop = useCallback(() => {
    const list = ref.current;
    if (!list) {
      return;
    }
    if ('scrollToOffset' in list) {
      list.scrollToOffset({ animated: true, offset: 0 });
    } else {
      list.scrollTo({ animated: true, y: 0 });
    }
  }, []);

  return {
    ref,
    handleScroll,
    scrollToTop,
    visible,
  };
}
