import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeDiagnosticText } from '../src/lib/diagnostic-redaction.ts';

test('diagnostic text removes bearer and named tokens', () => {
  const sanitized = sanitizeDiagnosticText(
    'Authorization: Bearer secret.value access_token=abc refreshToken: def',
  );

  assert.equal(sanitized.includes('secret.value'), false);
  assert.equal(sanitized.includes('abc'), false);
  assert.equal(sanitized.includes('def'), false);
  assert.match(sanitized, /\[REDACTED\]/);
});

test('diagnostic text removes OAuth callback parameters', () => {
  const sanitized = sanitizeDiagnosticText(
    'kaku://auth/callback?code=secret-code&state=secret-state&safe=yes',
  );

  assert.equal(sanitized.includes('secret-code'), false);
  assert.equal(sanitized.includes('secret-state'), false);
  assert.match(sanitized, /safe=yes/);
});

test('diagnostic text removes the local macOS username and limits length', () => {
  const sanitized = sanitizeDiagnosticText(
    `/Users/shqingda/project/${'x'.repeat(200)}`,
    48,
  );

  assert.equal(sanitized.includes('shqingda'), false);
  assert.equal(sanitized.length, 48);
});
