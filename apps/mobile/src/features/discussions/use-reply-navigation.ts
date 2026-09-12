import { useCallback, useEffect, useRef, useState } from 'react';

import type { DiscussionReply } from './model';

// 单集评论页用 FlashList，其余讨论屏仍是 FlatList：两种列表的
// scrollToIndex / scrollToOffset 签名兼容，ref 用 any（同
// use-scroll-to-top-button），由各屏幕把 ref 接到自己的列表组件上。
export function useReplyNavigation(replies: DiscussionReply[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [highlightedReplyId, setHighlightedReplyId] = useState<string>();

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    },
    [],
  );

  const openReply = useCallback(
    (replyId: string) => {
      const index = replies.findIndex((reply) => reply.id === replyId);

      if (index < 0) {
        return;
      }

      void listRef.current?.scrollToIndex({
        animated: true,
        index,
        viewPosition: 0.2,
      });
      setHighlightedReplyId(replyId);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(
        () => setHighlightedReplyId(undefined),
        1600,
      );
    },
    [replies],
  );

  const handleScrollToIndexFailed = useCallback(
    ({
      averageItemLength,
      index,
    }: {
      averageItemLength: number;
      index: number;
    }) => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: averageItemLength * index,
      });
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      retryTimerRef.current = setTimeout(
        () =>
          void listRef.current?.scrollToIndex({
            animated: true,
            index,
            viewPosition: 0.2,
          }),
        50,
      );
    },
    [],
  );

  return {
    handleScrollToIndexFailed,
    highlightedReplyId,
    listRef,
    openReply,
  };
}
