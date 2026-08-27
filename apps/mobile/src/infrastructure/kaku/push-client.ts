import { KakuApiError, readErrorMessage } from './auth-client.ts';

export async function registerPushDevice(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  input: { platform: 'android' | 'ios'; token: string },
) {
  const response = await request('/me/push-devices', {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
}

export async function unregisterPushDevice(
  request: (path: string, init?: RequestInit) => Promise<Response>,
) {
  const response = await request('/me/push-devices', { method: 'DELETE' });
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
}
