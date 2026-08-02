import { authSessionSchema } from '@/features/auth/auth-session';

const KAKU_API_URL = 'https://kaku-api.shqingda.workers.dev';
const APP_CALLBACK_URL = 'kaku://auth/callback';

async function readErrorMessage(response: Response) {
  const body = await response.json().catch(() => null);

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return `Kaku 服务返回了 ${response.status}`;
}

export function getBangumiLoginUrl() {
  const url = new URL('/auth/bangumi/start', KAKU_API_URL);
  url.searchParams.set('app_redirect_uri', APP_CALLBACK_URL);
  return url.toString();
}

export function getAppCallbackUrl() {
  return APP_CALLBACK_URL;
}

export async function exchangeHandoffCode(code: string) {
  const response = await fetch(`${KAKU_API_URL}/auth/session`, {
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return authSessionSchema.parse(await response.json());
}
