import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BangumiReportError,
  createBangumiReport,
} from '../src/reports/bangumi-client.ts';

test('reporting a user posts the typed payload to the report endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/report');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer bangumi-access-token');
    assert.deepEqual(JSON.parse(init.body), {
      comment: '持续刷屏辱骂',
      id: 424242,
      type: 6,
      value: 1,
    });
    return Response.json({ message: '已提交举报' });
  };

  const result = await createBangumiReport({
    accessToken: 'bangumi-access-token',
    comment: '持续刷屏辱骂',
    fetcher,
    id: 424242,
    reason: 1,
    type: 6,
  });

  assert.deepEqual(result, { message: '已提交举报' });
});

test('reporting maps rate limits to a retry message', async () => {
  const fetcher = async () => new Response('{}', { status: 429 });

  await assert.rejects(
    () =>
      createBangumiReport({
        accessToken: 'bangumi-access-token',
        fetcher,
        id: 1,
        reason: 2,
        type: 6,
      }),
    (error) => {
      assert.ok(error instanceof BangumiReportError);
      assert.equal(error.status, 429);
      assert.equal(error.message, '举报得太频繁了，请稍后再试。');
      return true;
    },
  );
});
