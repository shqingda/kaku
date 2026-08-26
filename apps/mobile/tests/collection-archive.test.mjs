import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COLLECTION_ARCHIVE_MAX_ITEMS,
  buildCollectionArchiveCsv,
  buildCollectionArchiveJson,
  collectPublicCollectionArchive,
  describeCollectionArchive,
  parseCollectionArchive,
} from '../src/features/collections/collection-archive-model.ts';

function page(items, nextOffset, total = items.length) {
  return { items, nextOffset, total };
}

function item(id, subjectType, title = `条目 ${id}`) {
  return {
    collectionStatus: 'completed',
    id,
    progress: 12,
    rate: 8,
    subjectType,
    title,
    totalEpisodes: 12,
    updatedAt: '2026-08-01T00:00:00Z',
    volumeProgress: 0,
  };
}

test('collects every public collection page across media types', async () => {
  const calls = [];
  const archive = await collectPublicCollectionArchive({
    exportedAt: '2026-08-26T00:00:00.000Z',
    fetchPage: async (subjectType, offset) => {
      calls.push([subjectType, offset]);
      if (subjectType === 2 && offset === 0) {
        return page([item(1, 2, '葬送的芙莉莲')], 20, 21);
      }
      if (subjectType === 2 && offset === 20) {
        return page([item(2, 2, '命运石之门')], undefined, 21);
      }
      if (subjectType === 1) {
        return page([item(3, 1, '三体')], undefined, 1);
      }
      return page([], undefined, 0);
    },
    username: 'kaku',
  });

  assert.deepEqual(calls.slice(0, 3), [
    [2, 0],
    [2, 20],
    [1, 0],
  ]);
  assert.equal(archive.items.length, 3);
  assert.equal(archive.truncated, false);
  assert.equal(archive.username, 'kaku');
  assert.equal(JSON.parse(buildCollectionArchiveJson(archive)).items[0].title, '葬送的芙莉莲');
  assert.match(buildCollectionArchiveCsv(archive), /^id,title,subjectType/);
  assert.match(buildCollectionArchiveCsv(archive), /葬送的芙莉莲/);
  assert.deepEqual(describeCollectionArchive(archive).typeCounts, [
    { label: '动画', total: 2 },
    { label: '书籍', total: 1 },
  ]);
});

test('csv round-trips quoted titles and parses back into an archive', async () => {
  const archive = await collectPublicCollectionArchive({
    exportedAt: '2026-08-26T00:00:00.000Z',
    fetchPage: async (subjectType) =>
      subjectType === 2
        ? page([item(8, 2, 'Hello, "World"')], undefined, 1)
        : page([], undefined, 0),
    username: 'kaku',
  });
  const csv = buildCollectionArchiveCsv(archive);
  const parsed = parseCollectionArchive(csv);

  assert.match(csv, /"Hello, ""World"""/);
  assert.equal(parsed.items[0].title, 'Hello, "World"');
  assert.equal(parsed.items[0].collectionStatus, 'completed');
});

test('rejects summary-only backups and empty payloads', () => {
  assert.throws(
    () => parseCollectionArchive('{"source":"bangumi-public-collection-totals","version":1}'),
    /不含条目列表/,
  );
  assert.throws(() => parseCollectionArchive('   '), /空的/);
  assert.throws(() => parseCollectionArchive('not-json-or-csv'), /CSV 表头不正确/);
});

test('stops at the export cap and reports truncation', async () => {
  const archive = await collectPublicCollectionArchive({
    fetchPage: async (subjectType, offset) => {
      if (subjectType !== 2) return page([], undefined, 0);
      const items = Array.from({ length: 20 }, (_, index) =>
        item(offset + index + 1, 2),
      );
      return page(items, offset + 20, COLLECTION_ARCHIVE_MAX_ITEMS + 20);
    },
    username: 'kaku',
  });

  assert.equal(archive.items.length, COLLECTION_ARCHIVE_MAX_ITEMS);
  assert.equal(archive.truncated, true);
});
