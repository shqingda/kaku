import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TextInput, TextInputSelectionChangeEvent } from 'react-native';

import { insertAtSelection } from '@/features/rich-text/rich-text-input';

export function useBangumiEmojiInsertion(
  inputRef: RefObject<TextInput | null>,
  content: string,
  setContent: Dispatch<SetStateAction<string>>,
  maxLength: number,
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

  const insertText = useCallback(
    (text: string) => {
      const current = contentRef.current;
      const result = insertAtSelection(current, text, selectionRef.current, maxLength);
      if (!result) {
        return false;
      }

      contentRef.current = result.content;
      selectionRef.current = result.selection;
      setContent(result.content);

      requestAnimationFrame(() => {
        inputRef.current?.setSelection(result.selection.start, result.selection.end);
      });
      return true;
    },
    [inputRef, maxLength, setContent],
  );

  return { insertText, onSelectionChange };
}
