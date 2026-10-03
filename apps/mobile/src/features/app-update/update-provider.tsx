import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { useApkDownload } from './use-apk-download';
import { UpdateDownloadSheet } from './update-download-sheet';
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
  const apk = useApkDownload();
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [selected, setSelected] = useState<UpdateRelease>();
  const busy = useRef(false);
  const manualRequested = useRef(false);
  // 下载进度会频繁重渲染，只在本次 Provider 挂载时读取一次 SQLite。
  const [initialHistory] = useState(readHistory);
  const history = useRef<History>(initialHistory);
  const alive = useRef(true);
  function persist() { try { Storage.setItemSync(KEY, JSON.stringify(history.current)); } catch { /* Memory still throttles this running session. */ } }
  async function openPage(release: UpdateRelease) {
    try { await Linking.openURL(release.pageUrl); }
    catch { Alert.alert('无法打开更新页面', '请稍后重试。'); }
  }
  function offerUpdate(release: UpdateRelease) {
    Alert.alert(`发现新版本 ${release.version}`, release.apk
      ? `是否下载更新？约 ${(release.apk.size / 1024 / 1024).toFixed(1)} MB，将使用当前网络，下载后由你确认安装。`
      : '是否前往 App Store 更新？', [
      { text: '稍后', style: 'cancel' },
      { text: release.apk ? '下载更新' : '前往更新', onPress: () => {
        if (!alive.current) return;
        if (release.apk) {
          setSelected(release);
          setDownloadVisible(true);
          void apk.download(release);
        } else { void openPage(release); }
      } },
    ]);
  }
  async function check(manual = true) {
    if (downloadVisible || apk.status === 'downloading') return;
    if (busy.current) { if (manual) manualRequested.current = true; return; }
    if (!manual && (__DEV__ || updateSupport === 'unconfigured' || !checkDue(history.current.checked ?? 0, Date.now()))) return;
    busy.current = true;
    manualRequested.current = manual;
    history.current.checked = Date.now();
    persist();
    setState(previous => ({ ...previous, status: 'checking', error: undefined }));
    try {
      const release = await fetchLatestRelease();
      if (!alive.current) return;
      const newer = isNewerVersion(release.version, installedVersion);
      setState({ status: newer ? 'available' : 'latest', release: newer ? release : undefined });
      if (!newer) {
        if (manualRequested.current) Alert.alert('已是最新版', `当前版本 ${installedVersion}`);
      } else if (manualRequested.current || (AppState.currentState === 'active' && shouldRemind(release.version, history.current.reminded ?? {}, Date.now()))) {
        history.current.reminded = { version: release.version, at: Date.now() };
        persist();
        offerUpdate(release);
      }
    } catch (error) {
      if (alive.current) {
        const message = error instanceof Error ? error.message : '检查失败，请重试。';
        setState(previous => ({ ...previous, status: 'error', error: message }));
        if (manualRequested.current) Alert.alert('检查更新失败', message);
      }
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
  function closeDownload() {
    if (apk.status === 'downloading') void apk.cancel();
    setDownloadVisible(false);
  }
  return <Context.Provider value={{ state, check }}>
    {children}
    <UpdateDownloadSheet
      visible={downloadVisible}
      status={apk.status}
      progress={apk.progress}
      error={apk.error}
      onClose={closeDownload}
      onInstall={() => void apk.install()}
      onRetry={() => { if (selected) void apk.download(selected); }}
      onWeb={() => { if (selected) void openPage(selected); }}
    />
  </Context.Provider>;
}
export function useAppUpdate() {
  const value = useContext(Context);
  if (!value) throw new Error('AppUpdateProvider missing');
  return value;
}
