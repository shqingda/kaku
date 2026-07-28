import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';

import type { DiscussionReply } from './model';

export function useReplyNavigation(replies: DiscussionReply[]) {
  const listRef = useRef<FlatList<DiscussionReply>>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [highlightedReplyId, setHighlightedReplyId] = useState<string>();

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
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

      listRef.current?.scrollToIndex({
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
      setTimeout(
        () =>
          listRef.current?.scrollToIndex({
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
