import type { Env } from '../env.ts';
import { requireEnv } from '../env.ts';
import {
  BangumiOAuthError,
  refreshBangumiAccessToken,
} from './bangumi-client.ts';
import { decryptSecret, encryptSecret } from './crypto.ts';
import type { AuthStore } from './store.ts';

const REFRESH_EARLY_MS = 60 * 1000;

export class BangumiReauthorizationRequiredError extends Error {
  constructor() {
    super('Bangumi 授权已过期，请重新登录。');
    this.name = 'BangumiReauthorizationRequiredError';
  }
}

export async function getValidBangumiAccessToken({
  env,
  fetcher,
  now,
  store,
  userId,
}: {
  env: Env;
  fetcher: typeof fetch;
  now: number;
  store: AuthStore;
  userId: number;
}) {
  const encryptionKey = requireEnv(
    env.TOKEN_ENCRYPTION_KEY,
    'TOKEN_ENCRYPTION_KEY',
  );
  const credential = await store.getBangumiCredential(userId);

  if (!credential) {
    throw new BangumiReauthorizationRequiredError();
  }

  if (credential.accessTokenExpiresAt > now + REFRESH_EARLY_MS) {
    return decryptSecret(credential.accessToken, encryptionKey);
  }

  try {
    const token = await refreshBangumiAccessToken(
      await decryptSecret(credential.refreshToken, encryptionKey),
      env,
      fetcher,
    );

    if (token.user_id !== userId) {
      throw new BangumiReauthorizationRequiredError();
    }

    await store.saveBangumiCredential({
      accessToken: await encryptSecret(token.access_token, encryptionKey),
      accessTokenExpiresAt: now + token.expires_in * 1000,
      refreshToken: await encryptSecret(token.refresh_token, encryptionKey),
      updatedAt: now,
      userId,
    });

    return token.access_token;
  } catch (error) {
    // Bangumi rotates refresh tokens. If two requests refresh concurrently,
    // the loser reuses the credential just saved by the winner.
    const latest = await store.getBangumiCredential(userId);

    if (
      latest &&
      latest.updatedAt > credential.updatedAt &&
      latest.accessTokenExpiresAt > now
    ) {
      return decryptSecret(latest.accessToken, encryptionKey);
    }

    if (
      error instanceof BangumiReauthorizationRequiredError ||
      (error instanceof BangumiOAuthError &&
        (error.status === 400 || error.status === 401))
    ) {
      throw new BangumiReauthorizationRequiredError();
    }

    throw error;
  }
}
