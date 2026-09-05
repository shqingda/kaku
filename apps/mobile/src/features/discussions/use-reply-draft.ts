import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

// One mounted composer owns one key. Synchronous writes avoid late saves restoring
// deleted drafts and persist each edit before a background/unmount can interrupt it.
export function useReplyDraft(key: string | null, initialContent = '') {
  const [state, setState] = useState(() => {
    try {
      return { content: key ? Storage.getItemSync(key) ?? '' : initialContent, error: '', loaded: true };
    } catch {
      return { content: '', error: '草稿读取失败，请重试后再编辑', loaded: false };
    }
  });
  const latest = useRef(state.content);
  const sent = useRef(false);

  function save(content = latest.current) {
    if (!key) return true;
    try {
      if (content) Storage.setItemSync(key, content);
      else Storage.removeItemSync(key);
      setState(previous => ({ ...previous, error: '' }));
      return true;
    } catch {
      setState(previous => ({ ...previous, error: sent.current ? '回复已发送，但草稿清理失败，请重试清理，勿重复发送' : '草稿保存失败，内容仍在当前窗口，请重试' }));
      return false;
    }
  }
  function change(value: SetStateAction<string>) {
    const content = typeof value === 'function' ? value(latest.current) : value;
    latest.current = content;
    setState(previous => ({ ...previous, content }));
    save(content);
  }
  function retry() {
    if (sent.current) return clear();
    if (state.loaded) return save();
    try {
      const content = key ? Storage.getItemSync(key) ?? '' : initialContent;
      latest.current = content;
      setState({ content, error: '', loaded: true });
      return true;
    } catch {
      return false;
    }
  }
  function clear() {
    if (!save('')) return false;
    latest.current = '';
    setState({ content: '', error: '', loaded: true });
    return true;
  }
  function complete() {
    sent.current = true;
    try {
      // A previous composer may finish sending after a new one opened.
      if (key && Storage.getItemSync(key) !== latest.current) return true;
    } catch {
      setState(previous => ({ ...previous, error: '回复已发送，但草稿清理失败，请重试清理，勿重复发送' }));
      return false;
    }
    return clear();
  }
  useEffect(() => {
    const listener = AppState.addEventListener('change', status => {
      if (status !== 'active' && state.loaded) {
        if (sent.current) clear();
        else save();
      }
    });
    return () => listener.remove();
  }, [key, state.loaded]);

  return { ...state, change, save, retry, clear, complete };
}
