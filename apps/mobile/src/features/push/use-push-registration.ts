import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import { useAuth } from '@/features/auth/auth-provider';
import {
  registerPushDevice,
  unregisterPushDevice,
} from '@/features/push/device-registration';
import { userErrorMessage } from '@/lib/user-error-message';

import {
  hasNotificationsNativeModule,
  isPhysicalDevice,
  loadNotifications,
} from './native-notifications';

const ENABLED_KEY = 'kaku-push-enabled';

function describePushRegistrationError(error: unknown) {
  const detail = error instanceof Error ? error.message : '';
  if (/firebase|fcm|google[- ]services|default firebaseapp/i.test(detail)) {
    return 'Android 推送需要 Firebase（FCM）。当前包没有 google-services.json，拿不到设备令牌。';
  }
  return userErrorMessage(
    error,
    detail.trim() || '推送登记失败，请稍后重试。',
  );
}

export type PushStatus =
  | 'denied'
  | 'failed'
  | 'off'
  | 'on'
  | 'simulator'
  | 'unavailable';

function projectId() {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

export function usePushRegistration() {
  const { request, session } = useAuth();
  const [ready, setReady] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const registrationQueue = useRef<Promise<void>>(Promise.resolve());
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<PushStatus>(
    Platform.OS === 'web' ? 'unavailable' : 'off',
  );
  const [error, setError] = useState<string | null>(null);

  const restoreEnabled = useCallback(() => {
    if (Platform.OS === 'web') return;
    return Storage.getItem(ENABLED_KEY).then((value) => {
      setEnabled(value === 'true');
      setReady(true);
    }).catch(() => {
      setStatus('failed');
      setError('无法读取本机推送设置，请重试。');
    });
  }, []);

  useEffect(() => { void restoreEnabled(); }, [restoreEnabled]);

  const syncRegistration = useCallback(
    async (shouldEnable: boolean, isCurrent: () => boolean) => {
      if (Platform.OS === 'web') {
        setStatus('unavailable');
        return;
      }
      if (!hasNotificationsNativeModule()) {
        setStatus('unavailable');
        setError('当前安装还没有推送模块，需要重新编译后再打开。');
        return;
      }
      const Notifications = loadNotifications();
      if (!Notifications) {
        setStatus('unavailable');
        setError('当前安装还没有推送模块，需要重新编译后再打开。');
        return;
      }
      if (isPhysicalDevice() === false) {
        setStatus('simulator');
        setError('模拟器收不到远程推送，请用真机打开。');
        return;
      }
      if (!session) {
        setStatus('off');
        setError(null);
        return;
      }
      if (!shouldEnable) {
        try {
          await unregisterPushDevice(request);
        } catch (caughtError) {
          setStatus('failed');
          setError(describePushRegistrationError(caughtError));
          return;
        }
        setStatus('off');
        setError(null);
        return;
      }

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('kaku-default', {
            importance: Notifications.AndroidImportance.DEFAULT,
            name: 'Kaku',
          });
        }

        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          setStatus('denied');
          setError('系统通知权限未打开，可在设置里重新允许。');
          return;
        }

        const id = projectId();
        if (!id) {
          setStatus('failed');
          setError('当前构建缺少 Expo 项目编号，无法登记推送。');
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: id,
        });
        if (!isCurrent()) return;
        await registerPushDevice(request, {
          platform: Platform.OS === 'android' ? 'android' : 'ios',
          token: token.data,
        });
        setStatus('on');
        setError(null);
      } catch (caughtError) {
        setStatus('failed');
        setError(describePushRegistrationError(caughtError));
      }
    },
    [request, session],
  );

  useEffect(() => {
    if (!ready) return;
    let active = true;
    registrationQueue.current = registrationQueue.current.catch(() => undefined).then(async () => {
      if (active) await syncRegistration(enabled, () => active);
    });
    return () => { active = false; };
  }, [enabled, ready, retryVersion, syncRegistration]);

  const setPushEnabled = useCallback((next: boolean) => {
    setReady(true);
    setEnabled(next);
    void Storage.setItem(ENABLED_KEY, next ? 'true' : 'false');
  }, []);

  return {
    enabled,
    error,
    retry: () => {
      if (!ready) void restoreEnabled();
      else setRetryVersion((version) => version + 1);
    },
    setEnabled: setPushEnabled,
    status,
  };
}
