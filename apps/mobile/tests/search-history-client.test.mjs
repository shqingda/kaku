import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSearchHistoryResponse } from '../src/infrastructure/kaku/search-history-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('parseSearchHistoryResponse unwraps the history record', async () => {
  const response = Response.json({
    history: {
      items: ['芙莉莲', '攻壳机动队'],
      updatedAt: 1_785_940_000,
    },
  });

  const record = await parseSearchHistoryResponse(response);

  assert.deepEqual(record, {
    items: ['芙莉莲', '攻壳机动队'],
    updatedAt: 1_785_940_000,
  });
});

test('parseSearchHistoryResponse accepts a null updatedAt', async () => {
  const response = Response.json({ history: { items: [], updatedAt: null } });

  const record = await parseSearchHistoryResponse(response);

  assert.deepEqual(record, { items: [], updatedAt: null });
});

test('parseSearchHistoryResponse throws KakuApiError for failed responses', async () => {
  const response = new Response(JSON.stringify({ message: '云端历史不可用' }), {
    status: 503,
  });

  await assert.rejects(
    () => parseSearchHistoryResponse(response),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 503);
      assert.equal(error.message, '云端历史不可用');
      return true;
    },
  );
});
