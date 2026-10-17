import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import type { PushRegistration } from '@kaku/shared/push-contract';
import { isPhysicalDevice, loadNotifications } from './native-notifications';
import {
  registerPushDevice as register,
  unregisterPushDevice as unregister,
} from '@/infrastructure/kaku/push-client';

type Request = (path: string, init?: RequestInit) => Promise<Response>;
const TOKEN_KEY = 'kaku-push-device-token';

export async function registerPushDevice(
  request: Request,
  input: PushRegistration,
) {
  const previous = await Storage.getItem(TOKEN_KEY);
  if (previous && previous !== input.token) await unregister(request, previous);
  // Retain the identity even if the server accepts the request but its reply is lost.
  await Storage.setItem(TOKEN_KEY, input.token);
  await register(request, input);
}

export async function unregisterPushDevice(request: Request) {
  let token = await Storage.getItem(TOKEN_KEY);
  if (!token && isPhysicalDevice()) {
    // Older installs did not persist their token. Recover it without prompting.
    const notifications = loadNotifications();
    if (notifications && (Platform.OS === 'android' || Platform.OS === 'ios')) {
      const permission = await notifications.getPermissionsAsync();
      if (permission.status === 'granted') {
        const native = (await notifications.getDevicePushTokenAsync()).data;
        if (typeof native === 'string') token = native;
        if (token) await Storage.setItem(TOKEN_KEY, token);
      }
    }
  }
  if (!token) return;
  await unregister(request, token);
  // Keep the token for an idempotent retry and for subsequent account changes.
}
