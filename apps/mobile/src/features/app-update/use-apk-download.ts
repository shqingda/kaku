import { useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo';
import type { UpdateRelease } from './update-policy';

export function useApkDownload() {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [activeRelease, setActiveRelease] = useState<UpdateRelease>();
  const [error, setError] = useState('');
  const task = useRef<FileSystem.DownloadResumable | null>(null);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const completed = useRef<string | null>(null);
  const installing = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      void task.current?.cancelAsync().catch(() => {});
    };
  }, []);
  async function download(release: UpdateRelease) {
    if (!mounted.current || task.current || !release.apk) return;
    if (!requireOptionalNativeModule('ExpoIntentLauncher')) {
      setError('当前安装包尚不支持应用内安装，请使用网页下载，或安装包含此功能的新客户端。');
      setStatus('error');
      return;
    }
    if (!FileSystem.cacheDirectory) { setError('下载目录不可用，请使用网页下载。'); setStatus('error'); return; }
    const uri = `${FileSystem.cacheDirectory}kaku-update.apk`;
    completed.current = null;
    setActiveRelease(release);
    cancelled.current = false;
    setProgress(0); setError(''); setStatus('downloading');
    const downloadTask = FileSystem.createDownloadResumable(release.apk.url, uri, {}, event => {
      if (mounted.current && !cancelled.current) setProgress(Math.min(0.99, event.totalBytesWritten / release.apk!.size));
    });
    task.current = downloadTask;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; void downloadTask.cancelAsync().catch(() => {}); }, 10 * 60 * 1000);
    try {
      const result = await downloadTask.downloadAsync();
      if (timedOut) throw new Error('下载超时，可以重试或使用网页下载。');
      if (cancelled.current || !mounted.current) return;
      if (!result || result.status !== 200) throw new Error('下载未完成，请重试。');
      const file = await FileSystem.getInfoAsync(uri);
      if (!file.exists || file.size !== release.apk.size) throw new Error('安装包不完整，请重新下载。');
      if (cancelled.current || !mounted.current) return;
      completed.current = uri;
      setProgress(1); setStatus('ready');
    } catch (error) {
      if (mounted.current && !cancelled.current) {
        setError(error instanceof Error ? error.message : '下载失败，请重试。'); setStatus('error');
      }
    } finally {
      clearTimeout(timeout);
      if (!completed.current) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      task.current = null;
      if (mounted.current && cancelled.current) { setStatus('idle'); setProgress(0); setActiveRelease(undefined); }
    }
  }
  async function cancel() {
    cancelled.current = true;
    try { await task.current?.cancelAsync(); }
    catch { if (mounted.current) setError('正在停止下载，请稍候。'); }
  }
  async function install() {
    if (!completed.current || installing.current) return;
    installing.current = true;
    setError('');
    try {
      // Load only when installing; older development clients may not include this module.
      const { startActivityAsync } = require('expo-intent-launcher') as typeof import('expo-intent-launcher');
      const uri = await FileSystem.getContentUriAsync(completed.current);
      await startActivityAsync('android.intent.action.VIEW', {
        data: uri, type: 'application/vnd.android.package-archive', flags: 1,
      });
      // Returning from the installer does not prove installation succeeded.
    } catch {
      if (mounted.current) setError('未能打开安装器。请允许此应用安装更新后重试，或使用网页下载。');
    } finally { installing.current = false; }
  }
  return { status, progress, error, release: activeRelease, download, cancel, install };
}
