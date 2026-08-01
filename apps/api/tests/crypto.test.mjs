import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decryptSecret,
  encryptSecret,
  hashToken,
} from '../src/auth/crypto.ts';

const encryptionKey = Buffer.alloc(32, 7).toString('base64url');

test('token hashes are deterministic without preserving the original token', async () => {
  const firstHash = await hashToken('one-time-code');
  const secondHash = await hashToken('one-time-code');

  assert.equal(firstHash, secondHash);
  assert.notEqual(firstHash, 'one-time-code');
  assert.notEqual(firstHash, await hashToken('another-code'));
});

test('encrypted Bangumi tokens can be recovered only with the encryption key', async () => {
  const firstCiphertext = await encryptSecret('bangumi-token', encryptionKey);
  const secondCiphertext = await encryptSecret('bangumi-token', encryptionKey);

  assert.notEqual(firstCiphertext, secondCiphertext);
  assert.equal(
    await decryptSecret(firstCiphertext, encryptionKey),
    'bangumi-token',
  );
  await assert.rejects(() =>
    decryptSecret(firstCiphertext, Buffer.alloc(32, 8).toString('base64url')),
  );
});
