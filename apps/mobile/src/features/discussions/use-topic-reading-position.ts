import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const viewabilityConfig = { itemVisiblePercentThreshold: 10, minimumViewTime: 300 };
const storageKey = (account: number | undefined) => `kaku:topic-reading:v1:${account ?? 'guest'}`;
type Position = { topic: string; reply: string };
function read(account: number | undefined): Position[] {
  const raw = Storage.getItemSync(storageKey(account));
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('invalid reading positions');
  return value.filter((item): item is Position => Boolean(item && typeof item.topic === 'string' && typeof item.reply === 'string')).slice(0, 50);
}
function write(account: number | undefined, topic: string, reply: string | null) {
  const previous = read(account).filter(item => item.topic !== topic);
  Storage.setItemSync(storageKey(account), JSON.stringify((reply ? [{ topic, reply }, ...previous] : previous).slice(0, 50)));
}

export function useTopicReadingPosition(account: number | undefined, topic: string, fromNotification: boolean) {
  const [savedReply, setSavedReply] = useState<string | null>(null);
  const [error, setError] = useState('');
  const visibleReply = useRef<string | null>(null);
  const current = useRef({ account, topic, ready: false, tracking: false, last: '' });
  useEffect(() => {
    current.current = { account, topic, ready: false, tracking: false, last: '' };
    visibleReply.current = null;
    setSavedReply(null);
    setError('');
    try {
      const saved = read(account).find(item => item.topic === topic)?.reply ?? null;
      current.current.ready = true;
      if (!fromNotification) setSavedReply(saved);
    } catch { setError('阅读位置读取失败，本次仍可正常阅读。'); }
  }, [account, topic, fromNotification]);
  const recordReply = useCallback((id: string | null) => {
    const state = current.current;
    if (!state.ready || !state.tracking || !id || id === state.last) return;
    try {
      write(state.account, state.topic, id);
      state.last = id;
      setError('');
    } catch { setError('阅读位置未能保存，下次可能无法续接。'); }
  }, []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const id = viewableItems.find(item => item.isViewable)?.item?.id;
    visibleReply.current = typeof id === 'string' ? id : null;
    recordReply(visibleReply.current);
  }, [recordReply]);
  const beginReading = useCallback(() => {
    current.current.tracking = true;
    // A long reply may stay visible for the entire drag; it still deserves a bookmark.
    recordReply(visibleReply.current);
  }, [recordReply]);
  function fromStart() {
    try {
      write(account, topic, null);
      setSavedReply(null);
      setError('');
      current.current.last = '';
      current.current.tracking = false;
    } catch { setError('旧阅读位置未能清除，请重试。'); }
  }
  return { savedReply, error, fromStart, beginReading, onViewableItemsChanged, viewabilityConfig };
}
