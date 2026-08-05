import { z } from 'zod';

import type { Env } from '../env.ts';

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  user_id: z.coerce.number().int().positive(),
});

const currentUserSchema = z.object({
  avatar: z
    .object({
      large: z.string().optional(),
      medium: z.string().optional(),
      small: z.string().optional(),
    })
    .optional(),
  id: z.number().int().positive(),
  nickname: z.string(),
  username: z.string().min(1),
});

const USER_AGENT = 'Kaku/0.1 (Bangumi third-party client; development)';

export type BangumiTokenResponse = z.infer<typeof tokenResponseSchema>;
export type BangumiCurrentUser = z.infer<typeof currentUserSchema>;

export class BangumiOAuthError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Bangumi OAuth request failed with status ${status}`);
    this.name = 'BangumiOAuthError';
    this.status = status;
  }
}

async function readJson(response: Response) {
  if (!response.ok) {
    throw new BangumiOAuthError(response.status);
  }

  return response.json();
}

export async function exchangeAuthorizationCode(
  code: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  const body = new URLSearchParams({
    client_id: env.BANGUMI_CLIENT_ID,
    client_secret: env.BANGUMI_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.BANGUMI_REDIRECT_URI,
  });
  const response = await fetcher('https://bgm.tv/oauth/access_token', {
    body,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
  });

  return tokenResponseSchema.parse(await readJson(response));
}

export async function refreshBangumiAccessToken(
  refreshToken: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  const body = new URLSearchParams({
    client_id: env.BANGUMI_CLIENT_ID,
    client_secret: env.BANGUMI_CLIENT_SECRET,
    grant_type: 'refresh_token',
    redirect_uri: env.BANGUMI_REDIRECT_URI,
    refresh_token: refreshToken,
  });
  const response = await fetcher('https://bgm.tv/oauth/access_token', {
    body,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    method: 'POST',
    signal: AbortSignal.timeout(12_000),
  });

  return tokenResponseSchema.parse(await readJson(response));
}

export async function getBangumiCurrentUser(
  accessToken: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher('https://api.bgm.tv/v0/me', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });

  return currentUserSchema.parse(await readJson(response));
}

export function buildBangumiAuthorizeUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL('https://bgm.tv/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);

  return url.toString();
}
