import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

// Modal must be on screen and draft restoration must allow editing before focus.
export function useSheetInputFocus(visible: boolean, editable: boolean) {
  const inputRef = useRef<TextInput>(null);
  const [shown, setShown] = useState(false);
  const focused = useRef(false);
  useEffect(() => {
    if (!visible) {
      setShown(false);
      focused.current = false;
      return;
    }
    if (!shown || !editable || focused.current) return;
    const frame = requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      focused.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, shown, editable]);
  return { inputRef, onShow: () => setShown(true) };
}
