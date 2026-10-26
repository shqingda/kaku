import { z } from 'zod';
import type { PushPayload, SendResult } from './model.ts';
import { signProviderJwt } from './provider-jwt.ts';

type ApnsCredentials = { keyId: string; teamId: string; privateKey: string };
const credentialsSchema = z.object({ keyId: z.string().regex(/^[A-Z0-9]{10}$/), teamId: z.string().regex(/^[A-Z0-9]{10}$/), privateKey: z.string().min(1) });
const failureSchema = z.object({ reason: z.string(), timestamp: z.number().optional() });

// Token authentication: https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
export function createApnsClient(credentials: ApnsCredentials, fetcher: typeof fetch = fetch, now = Date.now) {
  if (!credentialsSchema.safeParse(credentials).success) throw new Error('APNs 服务配置无效。');
  let signedAt = 0;
  let cached: Promise<string> | undefined;
  function bearer() {
    // Reuse tokens for 50 minutes; Apple expires them after one hour.
    if (!cached || now() - signedAt >= 50 * 60_000) {
      signedAt = now();
      cached = signProviderJwt(credentials.privateKey, 'ES256', { kid: credentials.keyId }, {
        iss: credentials.teamId, iat: Math.floor(signedAt / 1000),
      }).catch(error => { cached = undefined; throw error; });
    }
    return cached;
  }
  return {
    async send(token: string, payload: PushPayload, target: {
      environment: 'sandbox' | 'production'; topic: string; registeredAt: number;
    }, isCurrent = async () => true): Promise<SendResult> {
      try {
        const authorization = await bearer();
        if (!await isCurrent()) return { status: 'failed', error: 'registration_changed' };
        const host = target.environment === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
        const response = await fetcher(`https://${host}/3/device/${encodeURIComponent(token)}`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
          headers: { authorization: `bearer ${authorization}`, 'content-type': 'application/json',
            'apns-topic': target.topic, 'apns-push-type': 'alert', 'apns-priority': '10',
          },
          body: JSON.stringify({ aps: { alert: { title: payload.title, body: payload.body },
            badge: payload.unreadCount, sound: 'default' }, href: '/notifications' }),
        });
        if (response.status === 200) return { status: 'accepted', id: response.headers.get('apns-id') ?? crypto.randomUUID() };
        const body = failureSchema.safeParse(await response.json().catch(() => null));
        if (body.success && body.data.reason === 'ExpiredProviderToken') cached = undefined;
        // A 410 can refer to an older installation. Preserve newer registrations.
        if (response.status === 410 && body.success && body.data.reason === 'Unregistered'
          && body.data.timestamp !== undefined && body.data.timestamp >= target.registeredAt) return { status: 'invalid' };
        return { status: 'failed', error: `apns_http_${response.status}` };
      } catch { return { status: 'failed', error: 'apns_request_failed' }; }
    },
  };
}
