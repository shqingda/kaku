import { useCallback, useState } from 'react';
import { APP_ICONS, appIconFromNativeName, type AppIconId } from './app-icon-catalog';
import { loadNativeAppIcons } from './app-icon-native';
import { playErrorHaptic, playSuccessHaptic } from '@/lib/haptics';

export type AppIconStatus = 'ready' | 'applying' | 'failed' | 'unsupported';

const UNSUPPORTED = '当前安装的 Kaku 还不能切换图标，请安装最新版本后再试。';
const FAILED = '图标没有切换成功，请重试。';

function readCurrent(native: ReturnType<typeof loadNativeAppIcons>): AppIconId | null {
  if (!native) return null;
  try {
    return appIconFromNativeName(native.getAppIconName())?.id ?? null;
  } catch {
    return null;
  }
}

export function useAppIcon() {
  const [native] = useState(loadNativeAppIcons);
  const [current, setCurrent] = useState<AppIconId | null>(() => readCurrent(native));
  const [pending, setPending] = useState<AppIconId | null>(null);
  const [status, setStatus] = useState<AppIconStatus>(native ? 'ready' : 'unsupported');
  const [error, setError] = useState<string | null>(native ? null : UNSUPPORTED);

  const select = useCallback(async (id: AppIconId) => {
    if (!native || pending || id === current) return;
    const icon = APP_ICONS.find((entry) => entry.id === id);
    if (!icon) return;
    setPending(id);
    setStatus('applying');
    setError(null);
    try {
      await native.setAlternateAppIcon(icon.nativeName);
      // Android 端原生实现会吞掉异常，所以切换后再读一次，以系统实际状态为准。
      const applied = readCurrent(native);
      setCurrent(applied);
      if (applied !== id) throw new Error('icon not applied');
      setStatus('ready');
      playSuccessHaptic();
    } catch {
      playErrorHaptic();
      setStatus('failed');
      setError(FAILED);
    } finally {
      setPending(null);
    }
  }, [current, native, pending]);

  return { current, error, pending, select, status };
}
