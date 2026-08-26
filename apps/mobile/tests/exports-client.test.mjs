import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCloudExport,
  deleteCloudExport,
  downloadCloudExport,
  listCloudExports,
} from '../src/infrastructure/kaku/exports-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const record = {
  byteSize: 12,
  createdAt: 1,
  expiresAt: 2,
  format: 'json',
  id: 'export-1',
};

test('listCloudExports reads the authenticated backup list', async () => {
  const items = await listCloudExports(async (path) => {
    assert.equal(path, '/me/exports');
    return new Response(JSON.stringify({ exports: [record] }));
  });
  assert.deepEqual(items, [record]);
});

test('createCloudExport posts JSON or CSV content', async () => {
  const created = await createCloudExport(
    async (path, init) => {
      assert.equal(path, '/me/exports');
      assert.equal(init.method, 'POST');
      assert.equal(JSON.parse(init.body).format, 'csv');
      return new Response(JSON.stringify({ export: { ...record, format: 'csv' } }), {
        status: 201,
      });
    },
    { content: 'id,title', format: 'csv' },
  );
  assert.equal(created.format, 'csv');
});

test('download and delete talk to the backup id', async () => {
  const body = await downloadCloudExport(async (path) => {
    assert.equal(path, '/me/exports/export-1');
    return new Response('{"ok":true}');
  }, 'export-1');
  assert.equal(body, '{"ok":true}');

  await deleteCloudExport(async (path, init) => {
    assert.equal(path, '/me/exports/export-1');
    assert.equal(init.method, 'DELETE');
    return new Response(JSON.stringify({ deleted: true }));
  }, 'export-1');
});

test('export client surfaces Kaku API errors', async () => {
  await assert.rejects(
    () =>
      listCloudExports(async () =>
        new Response(JSON.stringify({ message: '云端备份尚未启用。' }), {
          status: 503,
        }),
      ),
    (error) => {
      assert.equal(error instanceof KakuApiError, true);
      assert.equal(error.status, 503);
      assert.equal(error.message, '云端备份尚未启用。');
      return true;
    },
  );
});
