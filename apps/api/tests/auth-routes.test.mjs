import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { hashToken } from '../src/auth/crypto.ts';

const now = 1_800_000_000_000;
const env = {
  BANGUMI_CLIENT_ID: 'kaku-client',
  BANGUMI_CLIENT_SECRET: 'server-only-secret',
  BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
  DB: null,
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'),
};

function createFakeStore() {
  let handoff;
  let oauthTransaction;

  const state = {
    savedLogin: undefined,
    session: undefined,
  };

  return {
    state,
    store: {
      async authenticateSession(tokenHash, currentTime) {
        const session = state.session;
        if (
          !session ||
          session.tokenHash !== tokenHash ||
          session.expiresAt <= currentTime
        ) {
          return null;
        }
        return {
          sessionId: session.sessionId,
          user: {
            avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
            id: session.userId,
            nickname: 'Kaku User',
            username: 'kaku-user',
          },
          userId: session.userId,
        };
      },
      async consumeHandoff(codeHash, currentTime) {
        if (
          !handoff ||
          handoff.codeHash !== codeHash ||
          handoff.expiresAt <= currentTime
        ) {
          return null;
        }

        const consumed = handoff;
        handoff = undefined;

        return {
          avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
          id: consumed.userId,
          nickname: 'Kaku User',
          username: 'kaku-user',
        };
      },
      async consumeOAuthTransaction(stateHash, currentTime) {
        if (
          !oauthTransaction ||
          oauthTransaction.stateHash !== stateHash ||
          oauthTransaction.expiresAt <= currentTime
        ) {
          return null;
        }

        const consumed = oauthTransaction;
        oauthTransaction = undefined;

        return { appRedirectUri: consumed.appRedirectUri };
      },
      async createHandoff(input) {
        handoff = input;
      },
      async createOAuthTransaction(input) {
        oauthTransaction = input;
      },
      async createSession(input) {
        state.session = input;
      },
      async deleteAllSessions() {
        state.session = undefined;
      },
      async deleteBangumiCredential() {
        state.savedLogin = undefined;
      },
      async deleteSession(tokenHash) {
        if (state.session?.tokenHash === tokenHash) {
          state.session = undefined;
        }
      },
      async deleteSessionById(_userId, sessionId) {
        if (state.session?.sessionId !== sessionId) {
          return false;
        }
        state.session = undefined;
        return true;
      },
      async getBangumiCredential() {
        return null;
      },
      async getSessionForRefresh(refreshTokenHash, currentTime) {
        const session = state.session;
        if (
          !session ||
          session.refreshTokenHash !== refreshTokenHash ||
          session.refreshExpiresAt <= currentTime
        ) {
          return null;
        }
        return {
          sessionId: session.sessionId,
          user: {
            avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
            id: session.userId,
            nickname: 'Kaku User',
            username: 'kaku-user',
          },
          userId: session.userId,
        };
      },
      async listSessions() {
        return state.session
          ? [
              {
                createdAt: state.session.createdAt,
                deviceName: state.session.deviceName,
                expiresAt: state.session.refreshExpiresAt,
                lastUsedAt: state.session.createdAt,
                sessionId: state.session.sessionId,
              },
            ]
          : [];
      },
      async rotateSession(input) {
        if (
          !state.session ||
          state.session.sessionId !== input.sessionId ||
          state.session.refreshTokenHash !== input.previousRefreshTokenHash
        ) {
          return false;
        }
        state.session = { ...state.session, ...input };
        return true;
      },
      async saveBangumiCredential(input) {
        state.savedLogin = input;
      },
      async saveBangumiLogin(input) {
        state.savedLogin = input;
      },
    },
  };
}

function createBangumiFetch() {
  return async (input) => {
    const url = String(input);

    if (url === 'https://bgm.tv/oauth/access_token') {
      return Response.json({
        access_token: 'raw-access-token',
        expires_in: 604800,
        refresh_token: 'raw-refresh-token',
        user_id: 42,
      });
    }

    if (url === 'https://api.bgm.tv/v0/me') {
      return Response.json({
        avatar: { large: 'https://lain.bgm.tv/avatar.jpg' },
        id: 42,
        nickname: 'Kaku User',
        username: 'kaku-user',
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  };
}

test('OAuth login keeps secrets on the server and hands the app a one-time code', async () => {
  const fake = createFakeStore();
  const app = createApp({
    createStore: () => fake.store,
    fetcher: createBangumiFetch(),
    now: () => now,
  });

  const startResponse = await app.request('/auth/bangumi/start', {}, env);
  const authorizeUrl = new URL(startResponse.headers.get('location'));
  const oauthState = authorizeUrl.searchParams.get('state');

  assert.equal(startResponse.status, 302);
  assert.equal(authorizeUrl.origin, 'https://bgm.tv');
  assert.equal(authorizeUrl.pathname, '/oauth/authorize');
  assert.ok(oauthState);

  const callbackResponse = await app.request(
    `/auth/bangumi/callback?code=bangumi-code&state=${oauthState}`,
    {},
    env,
  );
  const appRedirect = new URL(callbackResponse.headers.get('location'));
  const handoffCode = appRedirect.searchParams.get('code');

  assert.equal(callbackResponse.status, 302);
  assert.equal(appRedirect.protocol, 'kaku:');
  assert.ok(handoffCode);
  assert.notEqual(fake.state.savedLogin.accessToken, 'raw-access-token');
  assert.notEqual(fake.state.savedLogin.refreshToken, 'raw-refresh-token');

  const sessionResponse = await app.request(
    '/auth/session',
    {
      body: JSON.stringify({ code: handoffCode }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  const session = await sessionResponse.json();

  assert.equal(sessionResponse.status, 200);
  assert.equal(session.user.username, 'kaku-user');
  assert.equal(fake.state.session.deviceName, '未知设备');
  assert.ok(session.refreshToken);
  assert.ok(session.sessionId);
  assert.notEqual(fake.state.session.tokenHash, session.sessionToken);
  assert.equal(fake.state.session.tokenHash, await hashToken(session.sessionToken));

  const replayResponse = await app.request(
    '/auth/session',
    {
      body: JSON.stringify({ code: handoffCode }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  assert.equal(replayResponse.status, 401);
});

test('refresh tokens rotate once and the new access token authenticates', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  const user = {
    avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
    id: 42,
    nickname: 'Kaku User',
    username: 'kaku-user',
  };
  await fake.store.createSession({
    createdAt: now,
    deviceName: 'Android 设备',
    expiresAt: now + 1,
    refreshExpiresAt: now + 10_000,
    refreshTokenHash: await hashToken('refresh-token-abcdefghijklmnopqrstuvwxyz'),
    sessionId: 'session-1',
    tokenHash: await hashToken('access-token-abcdefghijklmnopqrstuvwxyz'),
    userId: user.id,
  });

  const refreshResponse = await app.request(
    '/auth/session/refresh',
    {
      body: JSON.stringify({
        refreshToken: 'refresh-token-abcdefghijklmnopqrstuvwxyz',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  const refreshed = await refreshResponse.json();

  assert.equal(refreshResponse.status, 200);
  assert.notEqual(refreshed.refreshToken, 'refresh-token-abcdefghijklmnopqrstuvwxyz');

  const replayResponse = await app.request(
    '/auth/session/refresh',
    {
      body: JSON.stringify({
        refreshToken: 'refresh-token-abcdefghijklmnopqrstuvwxyz',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(replayResponse.status, 401);

  const sessionsResponse = await app.request(
    '/auth/sessions',
    { headers: { Authorization: `Bearer ${refreshed.sessionToken}` } },
    env,
  );
  const sessions = await sessionsResponse.json();
  assert.equal(sessionsResponse.status, 200);
  assert.equal(sessions.sessions[0].current, true);
  assert.equal(sessions.sessions[0].deviceName, 'Android 设备');
});

test('sign out revokes the current server session', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  const accessToken = 'access-token-abcdefghijklmnopqrstuvwxyz';
  await fake.store.createSession({
    createdAt: now,
    deviceName: 'iOS 设备',
    expiresAt: now + 10_000,
    refreshExpiresAt: now + 20_000,
    refreshTokenHash: await hashToken('refresh-token-abcdefghijklmnopqrstuvwxyz'),
    sessionId: 'session-2',
    tokenHash: await hashToken(accessToken),
    userId: 42,
  });

  const response = await app.request(
    '/auth/session',
    { headers: { Authorization: `Bearer ${accessToken}` }, method: 'DELETE' },
    env,
  );
  assert.equal(response.status, 204);

  const after = await app.request(
    '/auth/sessions',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    env,
  );
  assert.equal(after.status, 401);
});

test('disconnecting Bangumi removes every Kaku credential', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  const accessToken = 'access-token-abcdefghijklmnopqrstuvwxyz';
  await fake.store.createSession({
    createdAt: now,
    deviceName: 'Android 设备',
    expiresAt: now + 10_000,
    refreshExpiresAt: now + 20_000,
    refreshTokenHash: await hashToken('refresh-token-abcdefghijklmnopqrstuvwxyz'),
    sessionId: 'session-3',
    tokenHash: await hashToken(accessToken),
    userId: 42,
  });
  await fake.store.saveBangumiCredential({
    accessToken: 'encrypted-access-token',
    accessTokenExpiresAt: now + 10_000,
    refreshToken: 'encrypted-refresh-token',
    updatedAt: now,
    userId: 42,
  });

  const response = await app.request(
    '/auth/connection',
    { headers: { Authorization: `Bearer ${accessToken}` }, method: 'DELETE' },
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.bangumiTokenRevoked, false);
  assert.equal(fake.state.session, undefined);
  assert.equal(fake.state.savedLogin, undefined);
});

test('expired or already consumed OAuth state cannot reach Bangumi', async () => {
  const fake = createFakeStore();
  let fetchCount = 0;
  const app = createApp({
    createStore: () => fake.store,
    fetcher: async () => {
      fetchCount += 1;
      throw new Error('must not fetch');
    },
    now: () => now,
  });

  const response = await app.request(
    '/auth/bangumi/callback?code=code&state=unknown-state',
    {},
    env,
  );

  assert.equal(response.status, 400);
  assert.equal(fetchCount, 0);
});

test('OAuth start rejects arbitrary app redirect URIs', async () => {
  const fake = createFakeStore();
  const app = createApp({
    createStore: () => fake.store,
    now: () => now,
  });
  const response = await app.request(
    '/auth/bangumi/start?app_redirect_uri=https://attacker.example/callback',
    {},
    env,
  );

  assert.equal(response.status, 400);
});
