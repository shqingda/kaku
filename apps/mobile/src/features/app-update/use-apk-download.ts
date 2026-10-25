import { useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo';
import Storage from 'expo-sqlite/kv-store';
import { recordDiagnosticError } from '@/lib/diagnostic-log';
import { isNewerVersion, type UpdateRelease } from './update-policy';

const APK_RECORD_KEY = 'kaku:update-apk:v1';
type ApkRecord = { version: string; size: number };
// The fixed APK path is shared even if the provider remounts while cancellation
// is finishing. Hold it through download cleanup, installation, or cache removal.
let apkFileBusy = false;
function acquireApkFile() {
  if (apkFileBusy) return null;
  apkFileBusy = true;
  return () => { apkFileBusy = false; };
}
function readApkRecord(): ApkRecord | null {
  const value = JSON.parse(Storage.getItemSync(APK_RECORD_KEY) ?? 'null');
  return value && typeof value.version === 'string' && /^v?\d+\.\d+\.\d+$/.test(value.version)
    && Number.isSafeInteger(value.size) && value.size > 0 ? value : null;
}
async function removeApkFile() {
  if (FileSystem.cacheDirectory) {
    await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}kaku-update.apk`, { idempotent: true });
  }
  Storage.removeItemSync(APK_RECORD_KEY);
}
async function removeInstalledApk(installedVersion: string) {
  const releaseFile = acquireApkFile();
  if (!releaseFile) return;
  try {
    const record = readApkRecord();
    if (!record || !FileSystem.cacheDirectory || isNewerVersion(record.version, installedVersion)) return;
    const file = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}kaku-update.apk`);
    // Unknown/legacy files are only removed by the explicit cache action.
    if (file.exists && file.size !== record.size) return;
    await removeApkFile();
  } finally { releaseFile(); }
}

export function useApkDownload(installedVersion?: string) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [activeRelease, setActiveRelease] = useState<UpdateRelease>();
  const [error, setError] = useState('');
  const task = useRef<FileSystem.DownloadResumable | null>(null);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const completed = useRef<(ApkRecord & { uri: string }) | null>(null);
  const installing = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      void task.current?.cancelAsync().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!installedVersion) return;
    void removeInstalledApk(installedVersion).catch(() => {
      void recordDiagnosticError(new Error('旧更新安装包未能清理，可在账户页重试清理缓存')).catch(() => {});
    });
  }, [installedVersion]);
  async function download(release: UpdateRelease) {
    if (!mounted.current || task.current || installing.current || !release.apk) return;
    if (!requireOptionalNativeModule('ExpoIntentLauncher')) {
      setError('当前安装包尚不支持应用内安装，请使用网页下载，或安装包含此功能的新客户端。');
      setStatus('error');
      return;
    }
    if (!FileSystem.cacheDirectory) { setError('下载目录不可用，请使用网页下载。'); setStatus('error'); return; }
    const releaseFile = acquireApkFile();
    if (!releaseFile) {
      setError('安装包正在使用或清理，请稍后重试。');
      setStatus(previous => previous === 'ready' ? previous : 'error');
      return;
    }
    const uri = `${FileSystem.cacheDirectory}kaku-update.apk`;
    completed.current = null;
    setActiveRelease(release);
    cancelled.current = false;
    setProgress(0); setError(''); setStatus('downloading');
    let started = false;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Never let an older version record describe the file about to be replaced.
      Storage.removeItemSync(APK_RECORD_KEY);
      const downloadTask = FileSystem.createDownloadResumable(release.apk.url, uri, {}, event => {
        if (mounted.current && !cancelled.current) setProgress(Math.min(0.99, event.totalBytesWritten / release.apk!.size));
      });
      task.current = downloadTask;
      timeout = setTimeout(() => { timedOut = true; void downloadTask.cancelAsync().catch(() => {}); }, 10 * 60 * 1000);
      started = true;
      const result = await downloadTask.downloadAsync();
      if (timedOut) throw new Error('下载超时，可以重试或使用网页下载。');
      if (cancelled.current || !mounted.current) return;
      if (!result || result.status !== 200) throw new Error('下载未完成，请重试。');
      const file = await FileSystem.getInfoAsync(uri);
      if (!file.exists || file.size !== release.apk.size) throw new Error('安装包不完整，请重新下载。');
      if (cancelled.current || !mounted.current) return;
      const record = { version: release.version, size: release.apk.size };
      Storage.setItemSync(APK_RECORD_KEY, JSON.stringify(record));
      completed.current = { ...record, uri };
      setProgress(1); setStatus('ready');
    } catch (error) {
      if (mounted.current && !cancelled.current) {
        setError(error instanceof Error ? error.message : '下载失败，请重试。'); setStatus('error');
      }
    } finally {
      clearTimeout(timeout);
      if (started && !completed.current) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
        void recordDiagnosticError(new Error('未完成的更新安装包未能清理')).catch(() => {});
      });
      task.current = null;
      releaseFile();
      if (mounted.current && cancelled.current) { setStatus('idle'); setProgress(0); setActiveRelease(undefined); }
    }
  }
  async function cancel() {
    cancelled.current = true;
    try { await task.current?.cancelAsync(); }
    catch { if (mounted.current) setError('正在停止下载，请稍候。'); }
  }
  async function clearCache() {
    if (!mounted.current) return false;
    const releaseFile = acquireApkFile();
    if (!releaseFile) return false;
    try {
      await removeApkFile();
      completed.current = null;
      if (mounted.current) {
        setStatus('idle'); setProgress(0); setError(''); setActiveRelease(undefined);
      }
      return true;
    } finally { releaseFile(); }
  }
  async function install() {
    if (!mounted.current || !completed.current || installing.current) return;
    const releaseFile = acquireApkFile();
    if (!releaseFile) { setError('安装包正在使用或清理，请稍后重试。'); return; }
    const apk = completed.current;
    installing.current = true;
    setError('');
    try {
      const record = readApkRecord();
      const file = await FileSystem.getInfoAsync(apk.uri);
      if (!mounted.current) return;
      if (!record || record.version !== apk.version || record.size !== apk.size || !file.exists || file.size !== apk.size) {
        completed.current = null;
        setStatus('error'); setError('安装包已变化或被清理，请重新下载。');
        return;
      }
      // Load only when installing; older development clients may not include this module.
      const { startActivityAsync } = require('expo-intent-launcher') as typeof import('expo-intent-launcher');
      const uri = await FileSystem.getContentUriAsync(apk.uri);
      if (!mounted.current) return;
      await startActivityAsync('android.intent.action.VIEW', {
        data: uri, type: 'application/vnd.android.package-archive', flags: 1,
      });
      // Returning from the installer does not prove installation succeeded.
    } catch {
      if (mounted.current) setError('未能打开安装器。请允许此应用安装更新后重试，或使用网页下载。');
    } finally { installing.current = false; releaseFile(); }
  }
  return { status, progress, error, release: activeRelease, download, cancel, install, clearCache };
}
