import { useCallback, useEffect, useRef, useState } from 'react';
import type { DevicePushToken } from 'expo-notifications';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import type { AuthRequest } from '@/features/auth/auth-request-scope';
import { useAuth } from '@/features/auth/auth-provider';
import {
  registerPushDevice,
  unregisterPushDevice,
} from '@/features/push/device-registration';
import { nativePushRegistration } from './native-token';
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

type PushStatus =
  | 'denied'
  | 'failed'
  | 'off'
  | 'on'
  | 'registering'
  | 'simulator'
  | 'unavailable';

export function usePushRegistration() {
  const { authEpoch, captureRequest, session } = useAuth();
  const [ready, setReady] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const preferenceRevision = useRef(0);
  const preferenceWrites = useRef(Promise.resolve());
  const askPermission = useRef(false);
  const pendingNativeToken = useRef<DevicePushToken | null>(null);
  const lastNativeToken = useRef<DevicePushToken | null>(null);
  const currentIdentity = useRef(session?.user.id);
  currentIdentity.current = session?.user.id;
  const registrationQueue = useRef<Promise<void>>(Promise.resolve());
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<PushStatus>(
    Platform.OS === 'web' ? 'unavailable' : 'off',
  );
  const [error, setError] = useState<string | null>(null);

  const restoreEnabled = useCallback(() => {
    if (Platform.OS === 'web') return;
    const revision = preferenceRevision.current;
    return Storage.getItem(ENABLED_KEY).then((value) => {
      if (revision !== preferenceRevision.current) return;
      setEnabled(value === 'true');
      setReady(true);
    }).catch(() => {
      if (revision !== preferenceRevision.current) return;
      setStatus('failed');
      setError('无法读取本机推送设置，请重试。');
    });
  }, []);

  useEffect(() => { void restoreEnabled(); }, [restoreEnabled]);

  const syncRegistration = useCallback(
    async (shouldEnable: boolean, isCurrent: () => boolean, mayAskPermission: boolean, request?: AuthRequest) => {
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
      if (!session || !request) {
        setStatus('off');
        setError(null);
        return;
      }
      if (!shouldEnable) {
        try {
          await unregisterPushDevice(request);
          if (!isCurrent()) return;
        } catch (caughtError) {
          if (!isCurrent()) return;
          setStatus('failed');
          setError(describePushRegistrationError(caughtError));
          return;
        }
        setStatus('off');
        setError(null);
        return;
      }

      try {
        setStatus('registering');
        setError(null);
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('kaku-default', {
            importance: Notifications.AndroidImportance.DEFAULT,
            name: 'Kaku',
          });
        }

        if (!isCurrent()) return;
        let permission = await Notifications.getPermissionsAsync();
        if (!isCurrent()) return;
        if (permission.status !== 'granted' && mayAskPermission && permission.canAskAgain) {
          permission = await Notifications.requestPermissionsAsync();
          if (!isCurrent()) return;
        }
        if (permission.status !== 'granted') {
          setStatus('denied');
          setError('系统通知权限未打开，可在设置里重新允许。');
          return;
        }

        // Token events must use their supplied value: fetching inside a token
        // listener can emit the same event again and create an infinite loop.
        const fetched = pendingNativeToken.current ?? await Notifications.getDevicePushTokenAsync();
        const token = pendingNativeToken.current ?? fetched;
        pendingNativeToken.current = null;
        lastNativeToken.current = token;
        if (!isCurrent()) return;
        const registration = nativePushRegistration(Platform.OS, token.data, Constants.expoConfig?.extra?.push);
        await registerPushDevice(request, registration);
        if (!isCurrent()) return;
        setStatus('on');
        setError(null);
      } catch (caughtError) {
        if (!isCurrent()) return;
        setStatus('failed');
        setError(describePushRegistrationError(caughtError));
      }
    },
    [session],
  );

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const owner = session?.user.id;
    const auth = session ? captureRequest() : null;
    const mayAskPermission = askPermission.current;
    askPermission.current = false;
    const isCurrent = () => active && currentIdentity.current === owner && (auth?.isCurrent() ?? true);
    registrationQueue.current = registrationQueue.current.catch(() => undefined).then(async () => {
      if (isCurrent()) await syncRegistration(enabled, isCurrent, mayAskPermission, auth?.request);
    });
    return () => { active = false; };
  }, [authEpoch, captureRequest, enabled, ready, retryVersion, syncRegistration, session?.sessionId, session?.user.id]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active' && ready && enabled) {
        setRetryVersion((version) => version + 1);
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [ready, enabled]);

  useEffect(() => {
    const notifications = loadNotifications();
    if (!ready || !enabled || !notifications) return;
    // A refreshed native token must replace the previous device identity.
    const subscription = notifications.addPushTokenListener(token => {
      if (lastNativeToken.current?.type === token.type && lastNativeToken.current?.data === token.data) return;
      lastNativeToken.current = token;
      pendingNativeToken.current = token;
      setRetryVersion(version => version + 1);
    });
    return () => subscription.remove();
  }, [ready, enabled]);

  const setPushEnabled = useCallback((next: boolean) => {
    const revision = ++preferenceRevision.current;
    setPreferenceError(null);
    askPermission.current = next;
    setReady(true);
    setEnabled(next);
    setRetryVersion((version) => version + 1);
    preferenceWrites.current = preferenceWrites.current.catch(() => undefined)
      .then(() => Storage.setItem(ENABLED_KEY, next ? 'true' : 'false'))
      .catch(() => {
        if (revision === preferenceRevision.current) setPreferenceError('本机推送偏好未能保存，请重试。');
      });
  }, []);

  return {
    enabled,
    error: preferenceError ?? error,
    retry: () => {
      if (preferenceError) setPushEnabled(enabled);
      else if (!ready) void restoreEnabled();
      else setRetryVersion((version) => version + 1);
    },
    setEnabled: setPushEnabled,
    status: preferenceError ? 'failed' as const : status,
  };
}
