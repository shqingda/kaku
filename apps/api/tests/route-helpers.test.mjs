import assert from 'node:assert/strict';
import test from 'node:test';

import { BangumiOAuthError } from '../src/auth/bangumi-client.ts';
import { BangumiReauthorizationRequiredError } from '../src/auth/bangumi-token-service.ts';
import {
  authenticateContext,
  mapBangumiAuthError,
} from '../src/auth/route-helpers.ts';

function jsonContext(authorization) {
  return {
    env: { DB: {} },
    json(body, status) {
      return Response.json(body, { status });
    },
    req: {
      header(name) {
        return name === 'Authorization' ? authorization : undefined;
      },
    },
  };
}

test('authenticateContext creates one injected store and returns it with the session', async () => {
  let createStoreCalls = 0;
  const store = {
    async authenticateSession() {
      return {
        sessionId: 'session-1',
        user: { id: 42, nickname: 'Kaku', username: 'kaku' },
        userId: 42,
      };
    },
  };

  const result = await authenticateContext(
    jsonContext('Bearer '.concat('x'.repeat(32))),
    () => {
      createStoreCalls += 1;
      return store;
    },
    () => 1_800_000_000_000,
  );

  assert.equal(createStoreCalls, 1);
  assert.equal(result.store, store);
  assert.equal(result.authentication.userId, 42);
  assert.equal(result.authentication.user.username, 'kaku');
});

test('authenticateContext returns the unauthorized response without a bearer token', async () => {
  const store = {
    async authenticateSession() {
      throw new Error('should not authenticate');
    },
  };

  const { authentication, store: returnedStore } = await authenticateContext(
    jsonContext(undefined),
    () => store,
  );

  assert.equal(returnedStore, store);
  assert.equal(authentication.status, 401);
  assert.deepEqual(await authentication.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('mapBangumiAuthError maps reauthorization and oauth failures', async () => {
  const context = jsonContext(undefined);

  const reauthorization = mapBangumiAuthError(
    context,
    new BangumiReauthorizationRequiredError(),
  );
  const oauth = mapBangumiAuthError(context, new BangumiOAuthError(503));
  const other = mapBangumiAuthError(context, new Error('nope'));

  assert.equal(reauthorization.status, 409);
  assert.equal((await reauthorization.json()).error, 'bangumi_reauthorization_required');
  assert.equal(oauth.status, 503);
  assert.equal((await oauth.json()).error, 'bangumi_oauth_unavailable');
  assert.equal(other, null);
});
