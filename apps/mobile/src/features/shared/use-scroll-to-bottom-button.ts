import { useCallback, useRef, useState } from 'react';

const SHOW_THRESHOLD = 720;

// 讨论页「跳到底部」按钮：距列表底部超过阈值时显示。除滚动事件外，
// 内容尺寸与可视区域变化时也会重新计算，长话题一打开即可看到按钮。
// onLoadMore：分页列表（如吐槽箱）在跳到底部时顺便触发下一页加载，
// 由列表页脚展示加载状态；加载完成后不会自动继续滚动。
export function useScrollToBottomButton(
  externalRef?: { current: unknown },
  options?: { onLoadMore?: () => void },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalRef = useRef<any>(null);
  // 传进来的列表 ref 优先（讨论类页面已有 useReplyNavigation 持有的 ref）。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = (externalRef ?? internalRef) as { current: any };
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const metricsRef = useRef({ contentHeight: 0, offset: 0, viewportHeight: 0 });
  const onLoadMoreRef = useRef(options?.onLoadMore);
  onLoadMoreRef.current = options?.onLoadMore;

  const update = useCallback(() => {
    const { contentHeight, offset, viewportHeight } = metricsRef.current;
    if (!contentHeight || !viewportHeight) {
      return;
    }
    const nextVisible =
      contentHeight - viewportHeight - offset > SHOW_THRESHOLD;
    if (visibleRef.current === nextVisible) {
      return;
    }
    visibleRef.current = nextVisible;
    setVisible(nextVisible);
  }, []);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      metricsRef.current = {
        contentHeight: event.nativeEvent.contentSize.height,
        offset: event.nativeEvent.contentOffset.y,
        viewportHeight: event.nativeEvent.layoutMeasurement.height,
      };
      update();
    },
    [update],
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metricsRef.current = { ...metricsRef.current, contentHeight: height };
      update();
    },
    [update],
  );

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      metricsRef.current = {
        ...metricsRef.current,
        viewportHeight: event.nativeEvent.layout.height,
      };
      update();
    },
    [update],
  );

  const scrollToBottom = useCallback(() => {
    const list = ref.current;
    if (!list) {
      return;
    }
    if ('scrollToEnd' in list) {
      list.scrollToEnd({ animated: true });
    }
    onLoadMoreRef.current?.();
  }, []);

  return {
    handleContentSizeChange,
    handleLayout,
    handleScroll,
    ref,
    scrollToBottom,
    setVisible,
    visible,
  };
}
