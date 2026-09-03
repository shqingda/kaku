import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';

import { createD1PreferencesStore } from '../src/preferences/store.ts';
import { createD1PushDeviceStore } from '../src/push/store.ts';
import { createD1RecentSubjectsStore } from '../src/recent-subjects/store.ts';
import { createD1SearchHistoryStore } from '../src/search-history/store.ts';

const NOW = 1_800_000_000_000;

const WORKER_MODULES = [
  {
    type: 'ESModule',
    path: 'index.mjs',
    contents: 'export default { fetch() { return new Response("ok"); } }',
  },
];

let miniflare;
let database;
let searchHistoryStore;
let recentSubjectsStore;
let preferencesStore;
let pushStore;

before(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: 'kaku-test' },
    modules: WORKER_MODULES,
  });
  database = await miniflare.getD1Database('DB');
  await migrate(drizzle(database), { migrationsFolder: 'drizzle' });

  // 偏好/搜索历史/最近浏览/推送设备的外键都指向 users 表，先落用户。
  for (const [id, username] of [
    [42, 'kaku-user'],
    [43, 'other-user'],
  ]) {
    await database
      .prepare(
        'INSERT INTO users (bangumi_user_id, username, nickname, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, username, `User ${id}`, null, NOW, NOW)
      .run();
  }

  searchHistoryStore = createD1SearchHistoryStore(database);
  recentSubjectsStore = createD1RecentSubjectsStore(database);
  preferencesStore = createD1PreferencesStore(database);
  pushStore = createD1PushDeviceStore(database);
});

after(async () => {
  await miniflare?.dispose();
});

test('search history store roundtrips items and upserts per user', async () => {
  assert.equal(await searchHistoryStore.get(42), null);

  await searchHistoryStore.save({
    items: ['葬送的芙莉莲', '孤独摇滚'],
    updatedAt: NOW,
    userId: 42,
  });

  assert.deepEqual(await searchHistoryStore.get(42), {
    items: ['葬送的芙莉莲', '孤独摇滚'],
    updatedAt: NOW,
    userId: 42,
  });

  await searchHistoryStore.save({
    items: ['新的搜索'],
    updatedAt: NOW + 1,
    userId: 42,
  });

  assert.deepEqual(await searchHistoryStore.get(42), {
    items: ['新的搜索'],
    updatedAt: NOW + 1,
    userId: 42,
  });
});

test('search history store drops non-string entries from stored JSON', async () => {
  await database
    .prepare('UPDATE user_search_history SET items = ? WHERE user_id = ?')
    .bind(JSON.stringify(['正常', 12, null, '另一条']), 42)
    .run();

  assert.deepEqual((await searchHistoryStore.get(42)).items, [
    '正常',
    '另一条',
  ]);
});

test('recent subjects store roundtrips, filters invalid rows, and caps at 10', async () => {
  assert.equal(await recentSubjectsStore.get(42), null);

  await recentSubjectsStore.save({
    items: [
      { coverUrl: 'https://lain.bgm.tv/cover.jpg', id: 1, title: '芙莉莲', type: 2, viewedAt: NOW },
      { id: 2, title: '无封面条目', type: 1, viewedAt: NOW - 100 },
    ],
    updatedAt: NOW,
    userId: 42,
  });

  assert.deepEqual(await recentSubjectsStore.get(42), {
    items: [
      { coverUrl: 'https://lain.bgm.tv/cover.jpg', id: 1, title: '芙莉莲', type: 2, viewedAt: NOW },
      { id: 2, title: '无封面条目', type: 1, viewedAt: NOW - 100 },
    ],
    updatedAt: NOW,
    userId: 42,
  });

  const invalidRows = [
    { id: 3, title: '缺少 viewedAt', type: 2 },
    { id: -4, title: '编号非法', type: 2, viewedAt: NOW },
    { id: 5, title: '   ', type: 2, viewedAt: NOW },
    { id: 6, title: 7, type: 2, viewedAt: NOW },
    '不是对象',
  ];
  const fillers = Array.from({ length: 12 }, (_, index) => ({
    id: 100 + index,
    title: `条目 ${index}`,
    type: 2,
    viewedAt: NOW - index,
  }));
  await recentSubjectsStore.save({
    items: [...invalidRows, ...fillers],
    updatedAt: NOW + 2,
    userId: 42,
  });

  const stored = await recentSubjectsStore.get(42);
  assert.equal(stored.items.length, 10);
  assert.ok(stored.items.every((item) => item.id >= 100));
  assert.equal(stored.updatedAt, NOW + 2);
});

test('recent subjects store returns empty items when stored JSON is corrupt', async () => {
  await database
    .prepare('INSERT INTO user_recent_subjects (user_id, items, updated_at) VALUES (?, ?, ?)')
    .bind(43, '{not json', NOW)
    .run();

  assert.deepEqual(await recentSubjectsStore.get(43), {
    items: [],
    updatedAt: NOW,
    userId: 43,
  });
});

test('preferences store roundtrips locale and theme and upserts', async () => {
  assert.equal(await preferencesStore.get(42), null);

  await preferencesStore.save({
    locale: 'zh',
    theme: 'dark',
    updatedAt: NOW,
    userId: 42,
  });

  assert.deepEqual(await preferencesStore.get(42), {
    locale: 'zh',
    theme: 'dark',
    updatedAt: NOW,
    userId: 42,
  });

  await preferencesStore.save({
    locale: 'en',
    theme: 'light',
    updatedAt: NOW + 1,
    userId: 42,
  });

  assert.deepEqual(await preferencesStore.get(42), {
    locale: 'en',
    theme: 'light',
    updatedAt: NOW + 1,
    userId: 42,
  });
});

test('push device store upserts by token and lists distinct user ids', async () => {
  await pushStore.save({
    lastNotificationId: null,
    platform: 'android',
    token: 'token-a',
    updatedAt: NOW,
    userId: 42,
  });
  await pushStore.save({
    lastNotificationId: null,
    platform: 'ios',
    token: 'token-b',
    updatedAt: NOW,
    userId: 42,
  });
  await pushStore.save({
    lastNotificationId: null,
    platform: 'android',
    token: 'token-c',
    updatedAt: NOW,
    userId: 43,
  });

  assert.deepEqual(
    (await pushStore.listByUser(42)).map((device) => device.token).sort(),
    ['token-a', 'token-b'],
  );
  assert.deepEqual((await pushStore.listUserIds()).sort(), [42, 43]);

  // 同一 token 重复登记应更新平台与用户，而不是新增一行。
  await pushStore.save({
    lastNotificationId: 7,
    platform: 'ios',
    token: 'token-a',
    updatedAt: NOW + 1,
    userId: 42,
  });

  const updated = await pushStore.listByUser(42);
  assert.equal(updated.length, 2);
  assert.deepEqual(
    updated.find((device) => device.token === 'token-a'),
    {
      lastNotificationId: 7,
      platform: 'ios',
      token: 'token-a',
      updatedAt: NOW + 1,
      userId: 42,
    },
  );
});

test('push device store advances last notification per user and deletes precisely', async () => {
  await pushStore.setLastNotificationId(42, 99);

  for (const device of await pushStore.listByUser(42)) {
    assert.equal(device.lastNotificationId, 99);
  }
  assert.deepEqual(
    (await pushStore.listByUser(43)).map((device) => device.lastNotificationId),
    [null],
  );

  await pushStore.deleteByToken('token-a');
  assert.deepEqual(
    (await pushStore.listByUser(42)).map((device) => device.token),
    ['token-b'],
  );

  await pushStore.deleteByUser(42);
  assert.deepEqual(await pushStore.listByUser(42), []);
  assert.deepEqual((await pushStore.listUserIds()).sort(), [43]);
});
