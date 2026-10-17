import type { Env } from '../env.ts';
import { createApnsClient } from './apns-client.ts';
import { createFcmClient } from './fcm-client.ts';
import type { PushPayload, SendResult } from './model.ts';
import type { StoredPushDevice } from './store.ts';

export function isNativePushDevice(device: StoredPushDevice) {
  return device.provider === 'fcm' && device.platform === 'android'
    || device.provider === 'apns' && device.platform === 'ios'
      && (device.apnsEnvironment === 'sandbox' || device.apnsEnvironment === 'production')
      && (device.apnsTopic === 'com.shqingda.kaku' || device.apnsTopic === 'com.shqingda.kaku.debug');
}

export type SendDevice = (device: StoredPushDevice, payload: PushPayload, isCurrent: () => Promise<boolean>) => Promise<SendResult>;

// Keep provider auth caches between Cron invocations. Environment and fetcher
// identity isolate credentials and test transports without serializing secrets.
const senders = new WeakMap<Env, WeakMap<typeof fetch, SendDevice>>();
export function nativePushSender(env: Env, fetcher: typeof fetch = fetch, now = Date.now): SendDevice {
  const byFetcher = senders.get(env) ?? new WeakMap<typeof fetch, SendDevice>();
  senders.set(env, byFetcher);
  const existing = byFetcher.get(fetcher);
  if (existing) return existing;
  let fcm: ReturnType<typeof createFcmClient> | undefined;
  let apns: ReturnType<typeof createApnsClient> | undefined;
  const sender: SendDevice = async (device, payload, isCurrent) => {
    if (!isNativePushDevice(device)) return { status: 'failed', error: 'unsupported_registration' };
    try {
      if (device.provider === 'fcm') {
        if (!env.FCM_SERVICE_ACCOUNT_JSON) return { status: 'failed', error: 'fcm_configuration_missing' };
        fcm ??= createFcmClient(env.FCM_SERVICE_ACCOUNT_JSON, fetcher, now);
        return fcm.send(device.token, payload, isCurrent);
      }
      if (!env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_PRIVATE_KEY) return { status: 'failed', error: 'apns_configuration_missing' };
      apns ??= createApnsClient({ keyId: env.APNS_KEY_ID, teamId: env.APNS_TEAM_ID, privateKey: env.APNS_PRIVATE_KEY }, fetcher, now);
      return apns.send(device.token, payload, { environment: device.apnsEnvironment!, topic: device.apnsTopic!, registeredAt: device.updatedAt }, isCurrent);
    } catch { return { status: 'failed', error: 'provider_configuration_invalid' }; }
  };
  byFetcher.set(fetcher, sender);
  return sender;
}
