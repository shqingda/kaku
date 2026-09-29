import { useCallback, useState, useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';
const KEY = 'kaku:hide-unwatched-discussions:v1';
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function read() {
  try { return Storage.getItemSync(KEY) === 'true'; }
  catch { return false; }
}
export function useSpoilerPreference() {
  const enabled = useSyncExternalStore(subscribe, read, () => false);
  const [error, setError] = useState('');
  const toggle = useCallback(() => {
    try {
      Storage.setItemSync(KEY, String(!read()));
      setError('');
      listeners.forEach(listener => listener());
    } catch { setError('设置未能保存，请重试。'); }
  }, []);
  return { enabled, error, toggle };
}
