import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

import type { DiscussionReply } from './model';

type ReplyList = {
  scrollToIndex: (options: {
    animated: boolean;
    index: number;
    viewPosition: number;
  }) => void | Promise<void>;
  scrollToOffset: (options: { animated: boolean; offset: number }) => void;
};

// 大部分讨论屏用 FlatList，单集页保留 FlashList 的实例与异步滚动签名。
export function useReplyNavigation<T extends ReplyList = FlatList<DiscussionReply>>(
  replies: DiscussionReply[],
) {
  const listRef = useRef<T>(null);
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
