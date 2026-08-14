import assert from 'node:assert/strict';
import test from 'node:test';

import { requireEnv } from '../src/env.ts';

test('requireEnv throws when the value is missing', () => {
  assert.throws(
    () => requireEnv(undefined, 'BANGUMI_CLIENT_ID'),
    /Missing required environment variable: BANGUMI_CLIENT_ID/,
  );
  assert.throws(
    () => requireEnv('', 'TOKEN_ENCRYPTION_KEY'),
    /Missing required environment variable: TOKEN_ENCRYPTION_KEY/,
  );
});

test('requireEnv returns the value when present', () => {
  assert.equal(requireEnv('client-id', 'BANGUMI_CLIENT_ID'), 'client-id');
});
