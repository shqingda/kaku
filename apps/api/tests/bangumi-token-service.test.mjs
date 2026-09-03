import assert from 'node:assert/strict';
import test from 'node:test';

import { BangumiOAuthError } from '../src/auth/bangumi-client.ts';
import { getValidBangumiAccessToken } from '../src/auth/bangumi-token-service.ts';
import { decryptSecret, encryptSecret } from '../src/auth/crypto.ts';

const now = 1_800_000_000_000;
const encryptionKey = Buffer.alloc(32, 7).toString('base64url');

async function encryptedCredential(overrides = {}) {
  return {
    accessToken: await encryptSecret('expired-access-token', encryptionKey),
    accessTokenExpiresAt: now - 1,
    refreshToken: await encryptSecret('old-refresh-token', encryptionKey),
    updatedAt: now - 10_000,
    userId: 42,
    ...overrides,
  };
}

function envWithKey(overrides = {}) {
  return {
    BANGUMI_CLIENT_ID: 'client-id',
    BANGUMI_CLIENT_SECRET: 'client-secret',
    BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
    TOKEN_ENCRYPTION_KEY: encryptionKey,
    ...overrides,
  };
}

test('a still-valid access token is decrypted without refreshing', async () => {
  let refreshCalls = 0;
  const accessToken = await getValidBangumiAccessToken({
    env: envWithKey(),
    fetcher: async () => {
      refreshCalls += 1;
      throw new Error('refresh must not be called');
    },
    now,
    store: {
      async getBangumiCredential() {
        return encryptedCredential({
          accessToken: await encryptSecret('live-access-token', encryptionKey),
          accessTokenExpiresAt: now + 3_600_000,
        });
      },
    },
    userId: 42,
  });

  assert.equal(accessToken, 'live-access-token');
  assert.equal(refreshCalls, 0);
});

test('a token exactly one minute from expiry is refreshed early', async () => {
  let refreshCalls = 0;
  const accessToken = await getValidBangumiAccessToken({
    env: envWithKey(),
    fetcher: async () => {
      refreshCalls += 1;
      return Response.json({
        access_token: 'early-refreshed-token',
        expires_in: 604800,
        refresh_token: 'early-refresh-token',
        user_id: 42,
      });
    },
    now,
    store: {
      async getBangumiCredential() {
        return encryptedCredential({
          accessTokenExpiresAt: now + 60_000,
        });
      },
      async saveBangumiCredential() {},
    },
    userId: 42,
  });

  assert.equal(accessToken, 'early-refreshed-token');
  assert.equal(refreshCalls, 1);
});

test('a token more than one minute from expiry is reused', async () => {
  let refreshCalls = 0;
  const accessToken = await getValidBangumiAccessToken({
    env: envWithKey(),
    fetcher: async () => {
      refreshCalls += 1;
      throw new Error('refresh must not be called');
    },
    now,
    store: {
      async getBangumiCredential() {
        return encryptedCredential({
          accessToken: await encryptSecret('still-fresh', encryptionKey),
          accessTokenExpiresAt: now + 60_001,
        });
      },
    },
    userId: 42,
  });

  assert.equal(accessToken, 'still-fresh');
  assert.equal(refreshCalls, 0);
});

test('expired Bangumi access tokens refresh and rotate their encrypted credential', async () => {
  let credential = await encryptedCredential();
  const fetcher = async (_input, init) => {
    assert.equal(init.body.get('grant_type'), 'refresh_token');
    assert.equal(init.body.get('refresh_token'), 'old-refresh-token');
    return Response.json({
      access_token: 'fresh-access-token',
      expires_in: 604800,
      refresh_token: 'rotated-refresh-token',
      user_id: 42,
    });
  };

  const accessToken = await getValidBangumiAccessToken({
    env: envWithKey(),
    fetcher,
    now,
    store: {
      async getBangumiCredential() {
        return credential;
      },
      async saveBangumiCredential(nextCredential) {
        credential = nextCredential;
      },
    },
    userId: 42,
  });

  assert.equal(accessToken, 'fresh-access-token');
  assert.equal(
    await decryptSecret(credential.refreshToken, encryptionKey),
    'rotated-refresh-token',
  );
  assert.equal(
    await decryptSecret(credential.accessToken, encryptionKey),
    'fresh-access-token',
  );
  assert.equal(credential.accessTokenExpiresAt, now + 604800 * 1000);
  assert.equal(credential.updatedAt, now);
  assert.notEqual(credential.accessToken, 'fresh-access-token');
});

test('a missing credential asks for re-authorization instead of refreshing', async () => {
  const fetcher = async () => {
    throw new Error('refresh must not be called');
  };

  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey({ TOKEN_ENCRYPTION_KEY: 'k' }),
      fetcher,
      now,
      store: {
        async getBangumiCredential() {
          return null;
        },
      },
      userId: 42,
    }),
    { name: 'BangumiReauthorizationRequiredError' },
  );
});

test('a missing encryption key fails before touching the store', async () => {
  let storeCalls = 0;

  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey({ TOKEN_ENCRYPTION_KEY: '' }),
      fetcher: async () => {
        throw new Error('refresh must not be called');
      },
      now,
      store: {
        async getBangumiCredential() {
          storeCalls += 1;
          return null;
        },
      },
      userId: 42,
    }),
    /Missing required environment variable: TOKEN_ENCRYPTION_KEY/,
  );
  assert.equal(storeCalls, 0);
});

test('a refresh that belongs to another Bangumi account is rejected', async () => {
  let saved = null;
  const fetcher = async () =>
    Response.json({
      access_token: 'hijacked-token',
      expires_in: 604800,
      refresh_token: 'hijacked-refresh',
      user_id: 99,
    });

  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey(),
      fetcher,
      now,
      store: {
        async getBangumiCredential() {
          return encryptedCredential();
        },
        async saveBangumiCredential(next) {
          saved = next;
        },
      },
      userId: 42,
    }),
    { name: 'BangumiReauthorizationRequiredError' },
  );
  assert.equal(saved, null);
});

test('a losing concurrent refresh recovers by reading back the newer credential', async () => {
  const expired = await encryptedCredential();
  const winnerSaved = {
    accessToken: await encryptSecret('winner-access', encryptionKey),
    accessTokenExpiresAt: now + 3_600_000,
    refreshToken: await encryptSecret('winner-refresh', encryptionKey),
    updatedAt: now + 5_000,
    userId: 42,
  };
  let reads = 0;

  const accessToken = await getValidBangumiAccessToken({
    env: envWithKey(),
    fetcher: async () => new Response(null, { status: 400 }),
    now,
    store: {
      async getBangumiCredential() {
        reads += 1;
        return reads === 1 ? expired : winnerSaved;
      },
      async saveBangumiCredential() {},
    },
    userId: 42,
  });

  assert.equal(accessToken, 'winner-access');
  assert.equal(reads, 2);
});

test('a concurrent winner whose token is already expired does not recover', async () => {
  const expired = await encryptedCredential();
  const staleWinner = {
    accessToken: await encryptSecret('stale-winner', encryptionKey),
    accessTokenExpiresAt: now,
    refreshToken: await encryptSecret('stale-refresh', encryptionKey),
    updatedAt: now + 5_000,
    userId: 42,
  };
  let reads = 0;

  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey(),
      fetcher: async () => new Response(null, { status: 400 }),
      now,
      store: {
        async getBangumiCredential() {
          reads += 1;
          return reads === 1 ? expired : staleWinner;
        },
        async saveBangumiCredential() {},
      },
      userId: 42,
    }),
    { name: 'BangumiReauthorizationRequiredError' },
  );
  assert.equal(reads, 2);
});

test('a concurrent write with the same timestamp is not treated as a winner', async () => {
  const expired = await encryptedCredential();
  let reads = 0;

  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey(),
      fetcher: async () => new Response(null, { status: 401 }),
      now,
      store: {
        async getBangumiCredential() {
          reads += 1;
          return expired;
        },
        async saveBangumiCredential() {},
      },
      userId: 42,
    }),
    { name: 'BangumiReauthorizationRequiredError' },
  );
  assert.equal(reads, 2);
});

test('a failed refresh with no newer credential asks for re-authorization on 400/401', async () => {
  for (const status of [400, 401]) {
    await assert.rejects(
      getValidBangumiAccessToken({
        env: envWithKey(),
        fetcher: async () => new Response(null, { status }),
        now,
        store: {
          async getBangumiCredential() {
            return encryptedCredential();
          },
          async saveBangumiCredential() {
            throw new Error('save must not run after a failed refresh');
          },
        },
        userId: 42,
      }),
      { name: 'BangumiReauthorizationRequiredError' },
    );
  }
});

test('a 5xx refresh failure is not treated as an expired grant', async () => {
  await assert.rejects(
    getValidBangumiAccessToken({
      env: envWithKey(),
      fetcher: async () => new Response(null, { status: 503 }),
      now,
      store: {
        async getBangumiCredential() {
          return encryptedCredential();
        },
        async saveBangumiCredential() {
          throw new Error('save must not run after a failed refresh');
        },
      },
      userId: 42,
    }),
    (error) => {
      assert.ok(error instanceof BangumiOAuthError);
      assert.equal(error.status, 503);
      return true;
    },
  );
});
