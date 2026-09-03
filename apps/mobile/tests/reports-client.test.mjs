import assert from 'node:assert/strict';
import test from 'node:test';

import { createReport } from '../src/infrastructure/kaku/reports-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('createReport posts the report payload and returns the message', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ message: '举报已收到' });
  };
  const input = { comment: '刷屏', id: 8, reason: 1, type: 1 };

  const message = await createReport(request, input);

  assert.deepEqual(calls, [
    {
      path: '/me/reports',
      init: {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.equal(message, '举报已收到');
});

test('createReport throws KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '举报过于频繁' }), { status: 429 });

  await assert.rejects(
    () => createReport(request, { id: 8, reason: 1, type: 1 }),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 429);
      assert.equal(error.message, '举报过于频繁');
      return true;
    },
  );
});
