import type { Hono } from 'hono';
import { z } from 'zod';

import type { Env } from '../env.ts';
import { requireEnv } from '../env.ts';
import {
  buildBangumiAuthorizeUrl,
  exchangeAuthorizationCode,
  getBangumiCurrentUser,
} from './bangumi-client.ts';
import {
  createRandomToken,
  encryptSecret,
  hashToken,
} from './crypto.ts';
import {
  createD1AuthStore,
  type AuthStore,
} from './store.ts';

const APP_REDIRECT_URI = 'kaku://auth/callback';
const OAUTH_TRANSACTION_TTL_MS = 5 * 60 * 1000;
const HANDOFF_TTL_MS = 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sessionRequestSchema = z.object({
  code: z.string().min(20),
});

export type AuthDependencies = {
  createStore?: (database: D1Database) => AuthStore;
  fetcher?: typeof fetch;
  now?: () => number;
};

function getStore(env: Env, dependencies: AuthDependencies) {
  return dependencies.createStore
    ? dependencies.createStore(env.DB)
    : createD1AuthStore(env.DB);
}

export function registerAuthRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/auth/bangumi/start', async (context) => {
    const appRedirectUri =
      context.req.query('app_redirect_uri') ?? APP_REDIRECT_URI;

    if (appRedirectUri !== APP_REDIRECT_URI) {
      return context.json(
        {
          error: 'invalid_app_redirect_uri',
          message: '不允许使用这个 App 回调地址。',
        },
        400,
      );
    }

    const clientId = requireEnv(
      context.env.BANGUMI_CLIENT_ID,
      'BANGUMI_CLIENT_ID',
    );
    const redirectUri = requireEnv(
      context.env.BANGUMI_REDIRECT_URI,
      'BANGUMI_REDIRECT_URI',
    );
    const state = createRandomToken();
    const createdAt = now();

    await getStore(context.env, dependencies).createOAuthTransaction({
      appRedirectUri,
      createdAt,
      expiresAt: createdAt + OAUTH_TRANSACTION_TTL_MS,
      stateHash: await hashToken(state),
    });

    return context.redirect(
      buildBangumiAuthorizeUrl({ clientId, redirectUri, state }),
    );
  });

  app.get('/auth/bangumi/callback', async (context) => {
    const code = context.req.query('code');
    const state = context.req.query('state');

    if (!code || !state) {
      return context.json(
        {
          error: 'invalid_oauth_callback',
          message: 'Bangumi 没有返回完整的授权信息。',
        },
        400,
      );
    }

    requireEnv(context.env.BANGUMI_CLIENT_ID, 'BANGUMI_CLIENT_ID');
    requireEnv(context.env.BANGUMI_CLIENT_SECRET, 'BANGUMI_CLIENT_SECRET');
    requireEnv(context.env.BANGUMI_REDIRECT_URI, 'BANGUMI_REDIRECT_URI');
    const encryptionKey = requireEnv(
      context.env.TOKEN_ENCRYPTION_KEY,
      'TOKEN_ENCRYPTION_KEY',
    );

    const store = getStore(context.env, dependencies);
    const transaction = await store.consumeOAuthTransaction(
      await hashToken(state),
      now(),
    );

    if (!transaction) {
      return context.json(
        {
          error: 'invalid_oauth_state',
          message: '授权请求已过期或已经使用，请回到 Kaku 重新登录。',
        },
        400,
      );
    }

    const token = await exchangeAuthorizationCode(
      code,
      context.env,
      fetcher,
    );
    const bangumiUser = await getBangumiCurrentUser(
      token.access_token,
      fetcher,
    );

    if (token.user_id !== bangumiUser.id) {
      throw new Error('Bangumi token user does not match /v0/me');
    }

    const updatedAt = now();
    await store.saveBangumiLogin({
      accessToken: await encryptSecret(token.access_token, encryptionKey),
      accessTokenExpiresAt: updatedAt + token.expires_in * 1000,
      refreshToken: await encryptSecret(token.refresh_token, encryptionKey),
      updatedAt,
      user: {
        avatarUrl:
          bangumiUser.avatar?.large ??
          bangumiUser.avatar?.medium ??
          bangumiUser.avatar?.small,
        id: bangumiUser.id,
        nickname: bangumiUser.nickname,
        username: bangumiUser.username,
      },
    });

    const handoffCode = createRandomToken();
    await store.createHandoff({
      codeHash: await hashToken(handoffCode),
      createdAt: updatedAt,
      expiresAt: updatedAt + HANDOFF_TTL_MS,
      userId: bangumiUser.id,
    });

    const appRedirect = new URL(transaction.appRedirectUri);
    appRedirect.searchParams.set('code', handoffCode);

    return context.redirect(appRedirect.toString());
  });

  app.post('/auth/session', async (context) => {
    const parsedBody = sessionRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return context.json(
        {
          error: 'invalid_handoff_code',
          message: '登录交接码格式不正确。',
        },
        400,
      );
    }

    const store = getStore(context.env, dependencies);
    const currentTime = now();
    const user = await store.consumeHandoff(
      await hashToken(parsedBody.data.code),
      currentTime,
    );

    if (!user) {
      return context.json(
        {
          error: 'invalid_handoff_code',
          message: '登录交接码已过期或已经使用。',
        },
        401,
      );
    }

    const sessionToken = createRandomToken();
    const expiresAt = currentTime + SESSION_TTL_MS;
    await store.createSession({
      createdAt: currentTime,
      expiresAt,
      tokenHash: await hashToken(sessionToken),
      userId: user.id,
    });

    return context.json({
      expiresAt,
      sessionToken,
      user,
    });
  });
}
