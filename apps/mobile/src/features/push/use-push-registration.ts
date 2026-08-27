import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import { useAuth } from '@/features/auth/auth-provider';
import {
  registerPushDevice,
  unregisterPushDevice,
} from '@/infrastructure/kaku/push-client';
import { userErrorMessage } from '@/lib/user-error-message';

import {
  hasNotificationsNativeModule,
  isPhysicalDevice,
  loadNotifications,
} from './native-notifications';

const ENABLED_KEY = 'kaku-push-enabled';

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
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<PushStatus>(
    Platform.OS === 'web' ? 'unavailable' : 'off',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Storage.getItem(ENABLED_KEY).then((value) => {
      setEnabled(value === 'true');
    });
  }, []);

  const syncRegistration = useCallback(
    async (shouldEnable: boolean) => {
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
        } catch {
          // 关闭开关时仍清掉本机标记；服务端失败下次登录会再对齐。
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
        await registerPushDevice(request, {
          platform: Platform.OS === 'android' ? 'android' : 'ios',
          token: token.data,
        });
        setStatus('on');
        setError(null);
      } catch (caughtError) {
        setStatus('failed');
        setError(
          userErrorMessage(caughtError, '推送登记失败，请稍后重试。'),
        );
      }
    },
    [request, session],
  );

  useEffect(() => {
    void syncRegistration(enabled);
  }, [enabled, session?.user.id, syncRegistration]);

  const setPushEnabled = useCallback((next: boolean) => {
    setEnabled(next);
    void Storage.setItem(ENABLED_KEY, next ? 'true' : 'false');
  }, []);

  return {
    enabled,
    error,
    retry: () => void syncRegistration(enabled),
    setEnabled: setPushEnabled,
    status,
  };
}
