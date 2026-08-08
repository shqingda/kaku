import { authSessionSchema } from '@/features/auth/auth-session';
import type { DeviceSession } from '@/features/auth/model';

import { z } from 'zod';

const KAKU_API_URL = 'https://kaku-api.shqingda.workers.dev';
const APP_CALLBACK_URL = 'kaku://auth/callback';

export async function readErrorMessage(response: Response) {
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

export class KakuApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'KakuApiError';
    this.status = status;
  }
}

async function ensureOk(response: Response) {
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return response;
}

export function getBangumiLoginUrl() {
  const url = new URL('/auth/bangumi/start', KAKU_API_URL);
  url.searchParams.set('app_redirect_uri', APP_CALLBACK_URL);
  return url.toString();
}

export function getAppCallbackUrl() {
  return APP_CALLBACK_URL;
}

export async function exchangeHandoffCode(code: string, deviceName: string) {
  const response = await fetch(`${KAKU_API_URL}/auth/session`, {
    body: JSON.stringify({ code, deviceName }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
  });

  return authSessionSchema.parse(await (await ensureOk(response)).json());
}

export async function refreshAuthSession(refreshToken: string) {
  const response = await fetch(`${KAKU_API_URL}/auth/session/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
  });

  return authSessionSchema.parse(await (await ensureOk(response)).json());
}

export function fetchKaku(
  path: string,
  sessionToken: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${sessionToken}`);

  return fetch(`${KAKU_API_URL}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(12_000),
  });
}

export function fetchPublicKaku(path: string, init: RequestInit = {}) {
  return fetch(`${KAKU_API_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(12_000),
  });
}

const deviceSessionsSchema = z.object({
  sessions: z.array(
    z.object({
      createdAt: z.number().int().positive(),
      current: z.boolean(),
      deviceName: z.string(),
      expiresAt: z.number().int().positive(),
      lastUsedAt: z.number().int().positive(),
      sessionId: z.string(),
    }),
  ),
});

export async function parseDeviceSessions(response: Response): Promise<DeviceSession[]> {
  return deviceSessionsSchema.parse(await (await ensureOk(response)).json()).sessions;
}
