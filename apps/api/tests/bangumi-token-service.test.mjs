import assert from 'node:assert/strict';
import test from 'node:test';

import { getValidBangumiAccessToken } from '../src/auth/bangumi-token-service.ts';
import { decryptSecret, encryptSecret } from '../src/auth/crypto.ts';

test('expired Bangumi access tokens refresh and rotate their encrypted credential', async () => {
  const now = 1_800_000_000_000;
  const encryptionKey = Buffer.alloc(32, 7).toString('base64url');
  let credential = {
    accessToken: await encryptSecret('expired-access-token', encryptionKey),
    accessTokenExpiresAt: now - 1,
    refreshToken: await encryptSecret('old-refresh-token', encryptionKey),
    updatedAt: now - 10_000,
    userId: 42,
  };
  const store = {
    async getBangumiCredential() {
      return credential;
    },
    async saveBangumiCredential(nextCredential) {
      credential = nextCredential;
    },
  };
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
    env: {
      BANGUMI_CLIENT_ID: 'client-id',
      BANGUMI_CLIENT_SECRET: 'client-secret',
      BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
      TOKEN_ENCRYPTION_KEY: encryptionKey,
    },
    fetcher,
    now,
    store,
    userId: 42,
  });

  assert.equal(accessToken, 'fresh-access-token');
  assert.equal(
    await decryptSecret(credential.refreshToken, encryptionKey),
    'rotated-refresh-token',
  );
  assert.notEqual(credential.accessToken, 'fresh-access-token');
});
