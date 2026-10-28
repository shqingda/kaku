import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestApp as createApp } from './helpers/app.mjs';
import { hashToken } from '../src/auth/crypto.ts';

const now = 1_800_000_000_000;
const codeVerifier = 'v'.repeat(43);
const codeChallenge = await hashToken(codeVerifier);
const requestId = '75164bd7-cdb1-42e6-8595-79273b2b90bf';
const startPath = `/auth/bangumi/start?code_challenge=${codeChallenge}&code_challenge_method=S256&request_id=${requestId}`;
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
  let connectionSequence = 0;

  const state = {
    extraSessions: [],
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
          connectionId: state.savedLogin?.userId === session.userId
            ? state.savedLogin.connectionId
            : null,
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
      async consumeHandoff(codeHash, currentTime, binding) {
        if (
          !handoff ||
          handoff.codeHash !== codeHash ||
          handoff.expiresAt <= currentTime ||
          handoff.codeChallenge !== binding?.codeChallenge ||
          handoff.requestId !== binding?.requestId ||
          !handoff.connectionId ||
          state.savedLogin?.userId !== handoff.userId ||
          state.savedLogin?.connectionId !== handoff.connectionId
        ) {
          return null;
        }

        const consumed = handoff;
        handoff = undefined;

        return {
          connectionId: consumed.connectionId,
          user: {
            avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
            id: consumed.userId,
            nickname: 'Kaku User',
            username: 'kaku-user',
          },
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

        return { appRedirectUri: consumed.appRedirectUri, codeChallenge: consumed.codeChallenge, requestId: consumed.requestId };
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
      async createSessionForConnection(input) {
        if (
          state.savedLogin?.userId !== input.userId ||
          state.savedLogin?.connectionId !== input.connectionId
        ) {
          return false;
        }
        state.session = input;
        return true;
      },
      async deleteAllSessions() {
        state.session = undefined;
      },
      async deleteOtherSessions(_userId, currentSessionId) {
        const extras = state.extraSessions.length;
        state.extraSessions = [];
        if (state.session && state.session.sessionId !== currentSessionId) {
          state.session = undefined;
          return extras + 1;
        }
        return extras;
      },
      async deleteBangumiCredential(userId, expectedConnectionId) {
        if (
          !expectedConnectionId ||
          state.savedLogin?.userId !== userId ||
          state.savedLogin?.connectionId !== expectedConnectionId
        ) {
          return false;
        }
        state.session = undefined;
        state.extraSessions = [];
        state.savedLogin = undefined;
        handoff = undefined;
        return true;
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
        if (
          state.savedLogin?.userId !== input.userId ||
          state.savedLogin?.connectionId !== input.connectionId ||
          state.savedLogin?.refreshToken !== input.previousRefreshToken
        ) {
          return false;
        }
        state.savedLogin = { ...state.savedLogin, ...input };
        return true;
      },
      async saveBangumiLogin(input) {
        const connectionId = `connection-${++connectionSequence}`;
        state.savedLogin = { ...input, connectionId, userId: input.user.id };
        return connectionId;
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

  const startResponse = await app.request(startPath, {}, env);
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
  assert.equal(appRedirect.searchParams.get('request_id'), requestId);
  assert.notEqual(fake.state.savedLogin.accessToken, 'raw-access-token');
  assert.notEqual(fake.state.savedLogin.refreshToken, 'raw-refresh-token');

  const sessionResponse = await app.request(
    '/auth/session',
    {
      body: JSON.stringify({ code: handoffCode, codeVerifier, requestId, deviceKey: "a".repeat(64) }),
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

  assert.equal(fake.state.session.deviceKey, await hashToken(`${session.user.id}:${"a".repeat(64)}`));
  assert.equal(session.deviceKey, undefined);

  const replayResponse = await app.request(
    '/auth/session',
    {
      body: JSON.stringify({ code: handoffCode, codeVerifier, requestId }),
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

test('DELETE /auth/sessions revokes every session except the current one', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  const accessToken = 'access-token-abcdefghijklmnopqrstuvwxyz';
  await fake.store.createSession({
    createdAt: now,
    deviceName: '当前设备',
    expiresAt: now + 10_000,
    refreshExpiresAt: now + 20_000,
    refreshTokenHash: await hashToken('refresh-token-abcdefghijklmnopqrstuvwxyz'),
    sessionId: 'session-current',
    tokenHash: await hashToken(accessToken),
    userId: 42,
  });
  fake.state.extraSessions = [
    {
      sessionId: 'session-peer',
    },
  ];

  const response = await app.request(
    '/auth/sessions',
    { headers: { Authorization: `Bearer ${accessToken}` }, method: 'DELETE' },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { revoked: 1 });
  assert.equal(fake.state.session?.sessionId, 'session-current');
  assert.equal(fake.state.extraSessions.length, 0);
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
  await fake.store.saveBangumiLogin({
    accessToken: 'encrypted-access-token',
    accessTokenExpiresAt: now + 10_000,
    refreshToken: 'encrypted-refresh-token',
    updatedAt: now,
    user: {
      avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
      id: 42,
      nickname: 'Kaku User',
      username: 'kaku-user',
    },
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


test('login start refuses absent or downgraded proof binding', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  for (const path of ['/auth/bangumi/start', `/auth/bangumi/start?code_challenge=${codeChallenge}&code_challenge_method=plain&request_id=${requestId}`]) {
    const response = await app.request(path, {}, env);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'login_upgrade_required');
  }
});

test('missing, wrong verifier or mismatched request cannot consume a bound handoff', async () => {
  const fake = createFakeStore();
  const app = createApp({ createStore: () => fake.store, now: () => now });
  const code = 'bound-handoff-code-abcdefghijklmnopqrstuvwxyz';
  const connectionId = await fake.store.saveBangumiLogin({
    accessToken: 'encrypted-access-token',
    accessTokenExpiresAt: now + 10_000,
    refreshToken: 'encrypted-refresh-token',
    updatedAt: now,
    user: {
      avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
      id: 42,
      nickname: 'Kaku User',
      username: 'kaku-user',
    },
  });
  await fake.store.createHandoff({ codeHash: await hashToken(code), codeChallenge, connectionId, requestId, createdAt: now, expiresAt: now + 60_000, userId: 42 });
  for (const body of [ { code }, { code, codeVerifier: 'x'.repeat(43), requestId }, { code, codeVerifier, requestId: 'c9d93139-61be-4733-b950-1df272e8a6ad' } ]) {
    const response = await app.request('/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, env);
    assert.ok([400, 401].includes(response.status));
    assert.equal(fake.state.session, undefined);
  }
  const request = () => app.request('/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier, requestId }) }, env);
  const responses = await Promise.all([request(), request()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 401]);
});
