import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRecentSubjectsResponse } from '../src/infrastructure/kaku/recent-subjects-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('parseRecentSubjectsResponse unwraps the recentSubjects record', async () => {
  const response = Response.json({
    recentSubjects: {
      items: [
        {
          coverUrl: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
          id: 425,
          title: '葬送的芙莉莲',
          type: 2,
          viewedAt: 1_785_940_000,
        },
      ],
      updatedAt: 1_785_950_000,
    },
  });

  const record = await parseRecentSubjectsResponse(response);

  assert.deepEqual(record, {
    items: [
      {
        coverUrl: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
        id: 425,
        title: '葬送的芙莉莲',
        type: 2,
        viewedAt: 1_785_940_000,
      },
    ],
    updatedAt: 1_785_950_000,
  });
});

test('parseRecentSubjectsResponse accepts a null updatedAt', async () => {
  const response = Response.json({
    recentSubjects: { items: [], updatedAt: null },
  });

  const record = await parseRecentSubjectsResponse(response);

  assert.deepEqual(record, { items: [], updatedAt: null });
});

test('parseRecentSubjectsResponse throws KakuApiError for failed responses', async () => {
  const response = new Response(JSON.stringify({ message: '同步失败' }), {
    status: 500,
  });

  await assert.rejects(
    () => parseRecentSubjectsResponse(response),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '同步失败');
      return true;
    },
  );
});
