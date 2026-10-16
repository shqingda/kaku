import type { Env } from '../env.ts';
import { requireEnv } from '../env.ts';
import {
  BangumiOAuthError,
  refreshBangumiAccessToken,
} from './bangumi-client.ts';
import { decryptSecret, encryptSecret } from './crypto.ts';
import type { AuthStore } from './store.ts';

const REFRESH_EARLY_MS = 60 * 1000;
// The deadline only stops waiting; an unknown exchange is never replayed.
const REFRESH_RESULT_DEADLINE_MS = 60 * 1000;
const REFRESH_WAIT_ATTEMPTS = 10;

export class BangumiRefreshUnconfirmedError extends Error {
  constructor() {
    super('Bangumi 授权刷新结果待确认。为避免重复兑换，请重新发起 Bangumi 授权；现有本机数据会保留。');
    this.name = 'BangumiRefreshUnconfirmedError';
  }
}

export class BangumiRefreshPendingError extends Error {
  constructor() {
    super('Bangumi 授权正在更新，请稍后重试。');
    this.name = 'BangumiRefreshPendingError';
  }
}

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
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: {
  env: Env;
  fetcher: typeof fetch;
  now: number;
  store: AuthStore;
  userId: number;
  wait?: (milliseconds: number) => Promise<void>;
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

  const operationId = crypto.randomUUID();
  const claimed = await store.claimBangumiRefresh({
    connectionId: credential.connectionId,
    refreshToken: credential.refreshToken,
    operationId,
    userId,
    now,
    leaseExpiresAt: now + REFRESH_RESULT_DEADLINE_MS,
  });

  if (!claimed) {
    for (let attempt = 0; attempt < REFRESH_WAIT_ATTEMPTS; attempt += 1) {
      const latest = await store.getBangumiCredential(userId);
      if (!latest || latest.connectionId !== credential.connectionId) {
        throw new BangumiRefreshPendingError();
      }
      if (latest.refreshToken !== credential.refreshToken && latest.accessTokenExpiresAt > now) {
        return decryptSecret(latest.accessToken, encryptionKey);
      }
      if (latest.refreshOperationId && (latest.refreshLeaseExpiresAt ?? 0) <= now) {
        throw new BangumiRefreshUnconfirmedError();
      }
      await wait(100);
    }
    throw new BangumiRefreshPendingError();
  }

  try {
    const token = await refreshBangumiAccessToken(
      await decryptSecret(credential.refreshToken, encryptionKey),
      env,
      fetcher,
    );

    if (token.user_id !== userId) {
      throw new BangumiRefreshUnconfirmedError();
    }

    const saved = await store.saveBangumiCredential({
      connectionId: credential.connectionId,
      previousRefreshToken: credential.refreshToken,
      operationId,
      accessToken: await encryptSecret(token.access_token, encryptionKey),
      accessTokenExpiresAt: now + token.expires_in * 1000,
      refreshToken: await encryptSecret(token.refresh_token, encryptionKey),
      updatedAt: now,
      userId,
    });

    if (!saved) throw new BangumiRefreshPendingError();

    return token.access_token;
  } catch (error) {
    // Recover a completed refresh of this connection, including same-ms saves.
    const latest = await store.getBangumiCredential(userId);

    if (
      latest &&
      latest.connectionId === credential.connectionId &&
      latest.refreshToken !== credential.refreshToken &&
      latest.accessTokenExpiresAt > now
    ) {
      return decryptSecret(latest.accessToken, encryptionKey);
    }

    if (
      error instanceof BangumiOAuthError &&
      (error.status === 400 || error.status === 401)
    ) {
      await store.releaseBangumiRefresh(userId, credential.connectionId, operationId);
      if (!latest || latest.connectionId !== credential.connectionId) {
        throw new BangumiRefreshPendingError();
      }
      throw new BangumiReauthorizationRequiredError();
    }

    throw error;
  }
}
