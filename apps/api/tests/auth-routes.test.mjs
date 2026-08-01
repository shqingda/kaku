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
