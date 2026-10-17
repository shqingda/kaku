import { z } from 'zod';
import type { PushPayload, SendResult } from './model.ts';
import { signProviderJwt } from './provider-jwt.ts';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const accountSchema = z.object({
  type: z.literal('service_account'),
  project_id: z.string().regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/),
  client_email: z.email(), private_key: z.string().min(1),
});
const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().max(3600) });
const successSchema = z.object({ name: z.string().regex(/^projects\/[^/]+\/messages\/[^/]+$/) });
const failureSchema = z.object({ error: z.object({
  status: z.string().optional(),
  details: z.array(z.object({ '@type': z.string(), errorCode: z.string().optional() })).optional(),
}) });

// HTTP v1 and OAuth service-account JWT: https://firebase.google.com/docs/cloud-messaging/send/v1-api
export function createFcmClient(secret: string, fetcher: typeof fetch = fetch, now = Date.now) {
  // Never include third-party credential contents in validation errors or logs.
  const parsed = accountSchema.safeParse((() => { try { return JSON.parse(secret); } catch { return null; } })());
  if (!parsed.success) throw new Error('FCM 服务账号配置无效。');
  const account = parsed.data;
  let cached: { token: string; expiresAt: number } | undefined;
  let refreshing: Promise<string> | undefined;
  async function accessToken() {
    if (cached && cached.expiresAt > now() + 60_000) return cached.token;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const iat = Math.floor(now() / 1000);
      const assertion = await signProviderJwt(account.private_key, 'RS256', {}, {
        iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: TOKEN_URL, iat, exp: iat + 3600,
      });
      const response = await fetcher(TOKEN_URL, { method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
        signal: AbortSignal.timeout(12_000),
      });
      const token = tokenSchema.safeParse(await response.json().catch(() => null));
      if (!response.ok || !token.success) throw new Error('FCM 身份认证失败。');
      cached = { token: token.data.access_token, expiresAt: now() + token.data.expires_in * 1000 };
      return cached.token;
    })();
    try { return await refreshing; } finally { refreshing = undefined; }
  }
  return {
    async send(token: string, payload: PushPayload, isCurrent = async () => true): Promise<SendResult> {
      try {
        const bearer = await accessToken();
        // OAuth refresh may outlive a revoked session. Recheck before sending.
        if (!await isCurrent()) return { status: 'failed', error: 'registration_changed' };
        const response = await fetcher(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
          headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token,
            notification: { title: payload.title, body: payload.body }, data: { href: '/notifications' },
            android: { priority: 'NORMAL', notification: {
              channel_id: 'kaku-default', sound: 'default', notification_count: payload.unreadCount,
            } },
          } }),
        });
        const body: unknown = await response.json().catch(() => null);
        if (response.ok) {
          const accepted = successSchema.safeParse(body);
          return accepted.success ? { status: 'accepted', id: accepted.data.name } : { status: 'failed', error: 'invalid_response' };
        }
        if (response.status === 401) cached = undefined;
        const failure = failureSchema.safeParse(body);
        // INVALID_ARGUMENT may mean our payload is wrong; never delete on that.
        const unregistered = failure.success && failure.data.error.details?.some(detail =>
          detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && detail.errorCode === 'UNREGISTERED');
        return response.status === 404 && unregistered ? { status: 'invalid' }
          : { status: 'failed', error: `fcm_http_${response.status}` };
      } catch { return { status: 'failed', error: 'fcm_request_failed' }; }
    },
  };
}
