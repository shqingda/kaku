import Storage from 'expo-sqlite/kv-store';
import Constants from 'expo-constants';
import { isPhysicalDevice, loadNotifications } from './native-notifications';
import {
  registerPushDevice as register,
  unregisterPushDevice as unregister,
} from '@/infrastructure/kaku/push-client';

type Request = (path: string, init?: RequestInit) => Promise<Response>;
const TOKEN_KEY = 'kaku-push-device-token';

export async function registerPushDevice(
  request: Request,
  input: { platform: 'android' | 'ios'; token: string },
) {
  // Retain the identity even if the server accepts the request but its reply is lost.
  await Storage.setItem(TOKEN_KEY, input.token);
  await register(request, input);
}

export async function unregisterPushDevice(request: Request) {
  let token = await Storage.getItem(TOKEN_KEY);
  if (!token && isPhysicalDevice()) {
    // Older installs did not persist their token. Recover it without prompting.
    const notifications = loadNotifications();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (notifications && typeof projectId === 'string') {
      const permission = await notifications.getPermissionsAsync();
      if (permission.status === 'granted') {
        token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
        await Storage.setItem(TOKEN_KEY, token);
      }
    }
  }
  if (!token) return;
  await unregister(request, token);
  // Keep the token for an idempotent retry and for subsequent account changes.
}
