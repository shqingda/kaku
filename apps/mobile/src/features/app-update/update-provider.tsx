import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { checkDue, isNewerVersion, shouldRemind, type UpdateRelease } from './update-policy';
import { fetchLatestRelease, installedVersion, updateSupport } from './update-client';

const KEY = 'kaku:update-check:v1';
type History = { checked?: number; reminded?: { version?: string; at?: number } };
function readHistory(): History {
  try { const data = JSON.parse(Storage.getItemSync(KEY) ?? '{}'); return data && typeof data === 'object' ? data : {}; } catch { return {}; }
}
type UpdateState = { status: 'idle' | 'checking' | 'latest' | 'available' | 'error'; release?: UpdateRelease; error?: string };
const Context = createContext<{ state: UpdateState; check: (manual?: boolean) => Promise<void> } | null>(null);
export function AppUpdateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const busy = useRef(false);
  const history = useRef<History>(readHistory());
  const alive = useRef(true);
  function persist() { try { Storage.setItemSync(KEY, JSON.stringify(history.current)); } catch { /* Memory still throttles this running session. */ } }
  async function check(manual = true) {
    if (busy.current) return;
    if (!manual && (__DEV__ || updateSupport === 'unconfigured' || !checkDue(history.current.checked ?? 0, Date.now()))) return;
    busy.current = true;
    history.current.checked = Date.now();
    persist();
    setState(previous => ({ ...previous, status: 'checking', error: undefined }));
    try {
      const release = await fetchLatestRelease();
      if (!alive.current) return;
      const newer = isNewerVersion(release.version, installedVersion);
      setState({ status: newer ? 'available' : 'latest', release: newer ? release : undefined });
      if (!manual && newer && AppState.currentState === 'active' && shouldRemind(release.version, history.current.reminded ?? {}, Date.now())) {
        history.current.reminded = { version: release.version, at: Date.now() };
        persist();
        Alert.alert(`发现新版本 ${release.version}`, '可查看更新内容，再决定是否下载。', [
          { text: '稍后', style: 'cancel' },
          { text: '查看更新', onPress: () => router.push('/app-update') },
        ]);
      }
    } catch (error) {
      if (alive.current) setState(previous => ({ ...previous, status: 'error', error: error instanceof Error ? error.message : '检查失败，请重试。' }));
    } finally { busy.current = false; }
  }
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    alive.current = true;
    if (AppState.currentState === 'active') void checkRef.current(false);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void checkRef.current(false); });
    return () => { alive.current = false; listener.remove(); };
  }, []);
  return <Context.Provider value={{ state, check }}>{children}</Context.Provider>;
}
export function useAppUpdate() {
  const value = useContext(Context);
  if (!value) throw new Error('AppUpdateProvider missing');
  return value;
}
