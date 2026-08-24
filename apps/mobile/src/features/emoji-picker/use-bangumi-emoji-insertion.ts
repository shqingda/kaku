import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TextInput, TextInputSelectionChangeEvent } from 'react-native';

export function useBangumiEmojiInsertion(
  inputRef: RefObject<TextInput | null>,
  content: string,
  setContent: Dispatch<SetStateAction<string>>,
) {
  const selectionRef = useRef({ start: 0, end: 0 });
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const onSelectionChange = useCallback(
    (event: TextInputSelectionChangeEvent) => {
      selectionRef.current = event.nativeEvent.selection;
    },
    [],
  );

  const insertEmoji = useCallback(
    (sticker: string) => {
      const current = contentRef.current;
      const focused = inputRef.current?.isFocused() ?? false;
      const { start, end } = focused
        ? selectionRef.current
        : { start: current.length, end: current.length };
      const from = Math.min(start, end);
      const to = Math.max(start, end);

      const next = current.slice(0, from) + sticker + current.slice(to);
      contentRef.current = next;
      setContent(next);

      const nextCursor = from + sticker.length;
      requestAnimationFrame(() => {
        inputRef.current?.setSelection(nextCursor, nextCursor);
      });
    },
    [inputRef, setContent],
  );

  return { insertEmoji, onSelectionChange };
}
