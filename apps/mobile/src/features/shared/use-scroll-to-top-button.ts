import { useCallback, useRef, useState } from 'react';
import type { FlatList, ScrollView } from 'react-native';

const SHOW_THRESHOLD = 720;

type Scrollable = ScrollView | FlatList<unknown>;

export function useScrollToTopButton(externalRef?: { current: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalRef = useRef<any>(null);
  // 传进来的列表 ref 优先（讨论类页面已有 useReplyNavigation 持有的 ref）。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = (externalRef ?? internalRef) as { current: any };
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
    setVisible,
    visible,
  };
}