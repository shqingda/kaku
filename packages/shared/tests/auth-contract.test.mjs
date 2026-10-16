import assert from 'node:assert/strict';
import test from 'node:test';
import { authSessionSchema, handoffSessionRequestSchema, handoffStartQuerySchema } from '../src/auth-contract.ts';

const requestId = '498e27b7-5192-48ce-9b13-f4a27f10f806';
test('handoff start requires a client request and an S256 challenge', () => {
  const input = { code_challenge: 'A'.repeat(43), code_challenge_method: 'S256', request_id: requestId };
  assert.equal(handoffStartQuerySchema.safeParse(input).success, true);
  for (const field of ['code_challenge', 'code_challenge_method', 'request_id']) {
    assert.equal(handoffStartQuerySchema.safeParse({ ...input, [field]: undefined }).success, false);
  }
  assert.equal(handoffStartQuerySchema.safeParse({ ...input, code_challenge_method: 'plain' }).success, false);
  assert.equal(handoffStartQuerySchema.safeParse({ ...input, code_challenge: '+'.repeat(43) }).success, false);
});

test('session exchange requires proof and the same request identifier', () => {
  const input = { code: 'code'.repeat(8), codeVerifier: 'A'.repeat(43), requestId, deviceName: 'iOS 设备' };
  assert.deepEqual(handoffSessionRequestSchema.parse(input), input);
  assert.equal(handoffSessionRequestSchema.safeParse({ code: input.code }).success, false);
  assert.equal(handoffSessionRequestSchema.safeParse({ ...input, codeVerifier: 'A'.repeat(129) }).success, false);
  assert.equal(handoffSessionRequestSchema.safeParse({ ...input, requestId: 'external' }).success, false);
});

test('shared session response validates identity and both credentials', () => {
  const input = { expiresAt: 1, refreshExpiresAt: 2, sessionId: 'session', sessionToken: 'A'.repeat(20), refreshToken: 'B'.repeat(20), user: { id: 1, nickname: '用户', username: 'user' } };
  assert.deepEqual(authSessionSchema.parse(input), input);
  assert.equal(authSessionSchema.safeParse({ ...input, user: { ...input.user, id: 0 } }).success, false);
});
