import { codeVerifierSchema, loginRequestIdSchema } from '@kaku/shared/auth-contract';
import { z } from 'zod';

const LOGIN_ATTEMPT_TTL_MS = 5 * 60 * 1000;
const pendingLoginSchema = z.object({
  codeVerifier: codeVerifierSchema,
  createdAt: z.number().int().nonnegative(),
  requestId: loginRequestIdSchema,
});
export type PendingLogin = z.infer<typeof pendingLoginSchema>;

export function parsePendingLogin(value: string, now = Date.now()): PendingLogin | null {
  try {
    const parsed = pendingLoginSchema.safeParse(JSON.parse(value));
    if (!parsed.success || parsed.data.createdAt > now || now - parsed.data.createdAt >= LOGIN_ATTEMPT_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function getHandoffCallback(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const requestId = loginRequestIdSchema.safeParse(url.searchParams.get('request_id'));
  if (url.protocol !== 'kaku:' || url.hostname !== 'auth' || url.pathname !== '/callback' ||
    url.username || url.password || url.port || url.hash ||
    url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('request_id').length !== 1 ||
    !code || code.length < 20 || !requestId.success) {
    throw new Error('登录回调无效，请回到 Kaku 重新发起登录。');
  }
  return { code, requestId: requestId.data };
}
