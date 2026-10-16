import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';

import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';

import { createD1AuthStore } from '../src/auth/store.ts';
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
  await seedPushSession('push-session-42', 42);
  await seedPushSession('push-session-43', 43);
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

async function seedPushSession(sessionId, userId, { refreshExpiresAt = NOW + 3_600_000, db = database } = {}) {
  await db.prepare('INSERT OR IGNORE INTO users (bangumi_user_id, username, nickname, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, `push-user-${userId}`, 'Push user', NOW, NOW).run();
  await db.prepare('INSERT OR IGNORE INTO bangumi_credentials (user_id, access_token, access_token_expires_at, refresh_token, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, 'encrypted-access', NOW + 3_600_000, 'encrypted-refresh', NOW).run();
  await db.prepare('INSERT INTO sessions (session_id, user_id, token_hash, refresh_token_hash, device_name, created_at, expires_at, last_used_at, refresh_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(sessionId, userId, `token-${sessionId}`, `refresh-${sessionId}`, 'iPhone', NOW, NOW - 1, NOW, refreshExpiresAt).run();
}

function pushDevice(token, userId = 42, sessionId = 'push-session-42', overrides = {}) {
  return {
    lastNotificationId: null, platform: 'ios', registrationId: `registration-${token}`,
    sessionId, token, updatedAt: NOW, userId, ...overrides,
  };
}

test('push device store upserts by token and lists distinct user ids', async () => {
  await pushStore.save({
    lastNotificationId: null,
    platform: 'android',
    token: 'token-a',
    sessionId: 'push-session-42',
    registrationId: 'registration-token-a',
    updatedAt: NOW,
    userId: 42,
  });
  await pushStore.save({
    lastNotificationId: null,
    platform: 'ios',
    token: 'token-b',
    sessionId: 'push-session-42',
    registrationId: 'registration-token-b',
    updatedAt: NOW,
    userId: 42,
  });
  await pushStore.save({
    lastNotificationId: null,
    platform: 'android',
    token: 'token-c',
    sessionId: 'push-session-43',
    registrationId: 'registration-token-c',
    updatedAt: NOW,
    userId: 43,
  });

  assert.deepEqual(
    (await pushStore.listByUser(42, NOW)).map((device) => device.token).sort(),
    ['token-a', 'token-b'],
  );
  assert.deepEqual((await pushStore.listUserIds(NOW)).sort(), [42, 43]);

  // 同一 token 重复登记应更新平台与用户，而不是新增一行。
  await pushStore.save({
    lastNotificationId: 7,
    platform: 'ios',
    token: 'token-a',
    sessionId: 'push-session-42',
    registrationId: 'registration-token-a',
    updatedAt: NOW + 1,
    userId: 42,
  });

  const updated = await pushStore.listByUser(42, NOW);
  assert.equal(updated.length, 2);
  assert.deepEqual(
    updated.find((device) => device.token === 'token-a'),
    {
      lastNotificationId: 7,
      platform: 'ios',
      token: 'token-a',
    sessionId: 'push-session-42',
    registrationId: 'registration-token-a',
      updatedAt: NOW + 1,
      userId: 42,
    },
  );
});

test('push device store advances last notification per device and deletes precisely', async () => {
  await pushStore.commitDelivery({ createdAt: NOW, devices: [pushDevice('token-a')], lastNotificationId: 99, tickets: [] });

  for (const device of await pushStore.listByUser(42, NOW)) {
    assert.equal(device.lastNotificationId, device.token === 'token-a' ? 99 : null);
  }
  assert.deepEqual(
    (await pushStore.listByUser(43, NOW)).map((device) => device.lastNotificationId),
    [null],
  );

  await pushStore.deleteByUserAndToken(43, 'push-session-43', 'token-a');
  assert.equal((await pushStore.listByUser(42, NOW)).length, 2);
  await pushStore.deleteByUserAndToken(42, 'push-session-42', 'token-a');
  assert.deepEqual(
    (await pushStore.listByUser(42, NOW)).map((device) => device.token),
    ['token-b'],
  );

  await pushStore.deleteRegistration(pushDevice('token-b'));
  assert.deepEqual(await pushStore.listByUser(42, NOW), []);
  assert.deepEqual((await pushStore.listUserIds(NOW)).sort(), [43]);
});


test('a session revoke cascades only its own push registration and receipts', async () => {
  await seedPushSession('revoke-this', 101);
  await seedPushSession('keep-this', 101);
  await seedPushSession('other-owner', 102);
  const revoked = pushDevice('revoked-device', 101, 'revoke-this');
  const kept = pushDevice('kept-device', 101, 'keep-this');
  const other = pushDevice('other-device', 102, 'other-owner');
  for (const item of [revoked, kept, other]) await pushStore.save(item);
  await pushStore.commitDelivery({ createdAt: NOW - 16 * 60_000, devices: [revoked, kept, other], lastNotificationId: 12,
    tickets: [revoked, kept, other].map((item) => ({ id: `ticket-${item.token}`, token: item.token })) });
  const authStore = createD1AuthStore(database);
  assert.equal(await authStore.deleteSessionById(102, 'revoke-this'), false);
  assert.equal(await authStore.deleteSessionById(101, 'revoke-this'), true);
  assert.deepEqual((await pushStore.listByUser(101, NOW)).map((item) => item.token), ['kept-device']);
  assert.deepEqual((await pushStore.listByUser(102, NOW)).map((item) => item.token), ['other-device']);
  const receipts = await pushStore.listPendingReceipts(NOW);
  assert.equal(receipts.some((item) => item.ticketId === 'ticket-revoked-device'), false);
  assert.equal(receipts.some((item) => item.ticketId === 'ticket-kept-device'), true);
  await seedPushSession('other-own-session', 101);
  await pushStore.save(pushDevice('other-own-device', 101, 'other-own-session'));
  assert.equal(await authStore.deleteOtherSessions(101, 'keep-this'), 1);
  assert.equal((await pushStore.listByUser(101, NOW)).length, 1);
  await authStore.deleteAllSessions(101);
  assert.deepEqual(await pushStore.listByUser(101, NOW), []);
  assert.equal((await pushStore.listPendingReceipts(NOW)).some((item) => item.userId === 101), false);
  assert.equal((await pushStore.listByUser(102, NOW)).length, 1);
});

test('push eligibility requires the same session owner, a live refresh session and retained provider credentials', async () => {
  await seedPushSession('live-refresh', 103);
  await seedPushSession('expired-refresh', 103, { refreshExpiresAt: NOW });
  await seedPushSession('foreign-owner', 104);
  assert.equal(await pushStore.save(pushDevice('live-device', 103, 'live-refresh')), true);
  assert.equal(await pushStore.save(pushDevice('expired-device', 103, 'expired-refresh')), false);
  assert.equal(await pushStore.save(pushDevice('wrong-owner', 103, 'foreign-owner')), false);
  // Access expiry alone does not revoke a device whose refresh session is valid.
  assert.deepEqual((await pushStore.listByUser(103, NOW)).map((item) => item.token), ['live-device']);
  await database.prepare('INSERT INTO push_devices (token, platform, updated_at, user_id, session_id, registration_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind('corrupt-owner-device', 'ios', NOW, 103, 'foreign-owner', 'corrupt-owner').run();
  assert.deepEqual((await pushStore.listByUser(103, NOW)).map((item) => item.token), ['live-device']);
  await database.prepare('UPDATE sessions SET refresh_expires_at = ? WHERE session_id = ?').bind(NOW, 'live-refresh').run();
  assert.deepEqual(await pushStore.listByUser(103, NOW), []);
  assert.equal((await pushStore.listUserIds(NOW)).includes(103), false);
  await database.prepare('UPDATE sessions SET refresh_expires_at = ? WHERE session_id = ?').bind(NOW + 1000, 'live-refresh').run();
  await database.prepare('DELETE FROM bangumi_credentials WHERE user_id = ?').bind(103).run();
  assert.deepEqual(await pushStore.listByUser(103, NOW), []);
  assert.equal(await pushStore.save(pushDevice('without-credential', 103, 'live-refresh')), false);
});

test('revocation cannot be undone by a registration request authenticated before it', async () => {
  await seedPushSession('revoked-before-save', 105);
  const snapshot = pushDevice('cannot-revive', 105, 'revoked-before-save');
  await pushStore.save(snapshot);
  await createD1AuthStore(database).deleteSession('token-revoked-before-save');
  assert.equal(await pushStore.save({ ...snapshot, registrationId: 'late-request' }), false);
  assert.deepEqual(await pushStore.listByUser(105, NOW), []);
  const rows = await database.prepare('SELECT token FROM push_devices WHERE token = ?').bind(snapshot.token).all();
  assert.deepEqual(rows.results, []);
});

test('receipt persistence and cursor advancement roll back together if D1 rejects a receipt', async () => {
  await seedPushSession('atomic-session', 106);
  const snapshot = pushDevice('atomic-device', 106, 'atomic-session', { lastNotificationId: 10 });
  await pushStore.save(snapshot);
  const second = { ...snapshot, token: 'atomic-second-device', registrationId: 'atomic-second-registration' };
  await pushStore.save(second);
  // This trigger models a storage constraint failure in the real D1 batch.
  await database.exec("CREATE TRIGGER reject_push_receipt BEFORE INSERT ON push_receipts WHEN NEW.ticket_id = 'reject-ticket' BEGIN SELECT RAISE(ABORT, 'receipt persistence rejected'); END");
  await assert.rejects(pushStore.commitDelivery({ createdAt: NOW, devices: [snapshot, second], lastNotificationId: 12,
    tickets: [{ id: 'rolled-back-ticket', token: snapshot.token }, { id: 'reject-ticket', token: second.token }] }), /receipt persistence rejected/);
  assert.deepEqual((await pushStore.listByUser(106, NOW)).map((item) => item.lastNotificationId), [10, 10]);
  assert.deepEqual((await database.prepare('SELECT ticket_id FROM push_receipts WHERE ticket_id = ?').bind('rolled-back-ticket').all()).results, []);
  await database.exec('DROP TRIGGER reject_push_receipt');
  await pushStore.commitDelivery({ createdAt: NOW - 15 * 60_000, devices: [snapshot], lastNotificationId: 12,
    tickets: [{ id: 'persisted-ticket', token: snapshot.token }] });
  assert.equal((await pushStore.listByUser(106, NOW))[0].lastNotificationId, 12);
  assert.equal((await pushStore.listPendingReceipts(NOW)).some((item) => item.ticketId === 'persisted-ticket'), true);
  await pushStore.commitDelivery({ createdAt: NOW, devices: [snapshot], lastNotificationId: 11, tickets: [] });
  assert.equal((await pushStore.listByUser(106, NOW))[0].lastNotificationId, 12);
});

test('late receipt cleanup and cursor commits cannot modify a newer registration of the same token', async () => {
  await seedPushSession('old-registration-session', 107);
  await seedPushSession('new-registration-session', 107);
  const previous = pushDevice('rebound-device', 107, 'old-registration-session', { lastNotificationId: 10 });
  await pushStore.save(previous);
  await pushStore.commitDelivery({ createdAt: NOW - 15 * 60_000, devices: [previous], lastNotificationId: 12,
    tickets: [{ id: 'old-registration-ticket', token: previous.token }] });
  const replacement = { ...previous, sessionId: 'new-registration-session', registrationId: 'replacement', lastNotificationId: null };
  await pushStore.save(replacement);
  await pushStore.deleteByUserAndToken(107, previous.sessionId, previous.token);
  await pushStore.deleteRegistration((await pushStore.listPendingReceipts(NOW)).find((item) => item.ticketId === 'old-registration-ticket'));
  await pushStore.commitDelivery({ createdAt: NOW, devices: [previous], lastNotificationId: 99,
    tickets: [{ id: 'late-acceptance-ticket', token: previous.token }] });
  assert.deepEqual(await pushStore.listByUser(107, NOW), [replacement]);
  const staleReceipt = await database.prepare('SELECT * FROM push_receipts WHERE ticket_id = ?').bind('late-acceptance-ticket').all();
  assert.deepEqual(staleReceipt.results, []);
});

test('receipt queries respect delay, retention and exact ticket deletion', async () => {
  await seedPushSession('receipt-boundaries', 108);
  const snapshot = pushDevice('receipt-boundary-device', 108, 'receipt-boundaries');
  await pushStore.save(snapshot);
  for (const [id, createdAt] of [['due', NOW - 15 * 60_000], ['later', NOW - 15 * 60_000 + 1], ['expired', NOW - 24 * 60 * 60_000]]) {
    await pushStore.commitDelivery({ createdAt, devices: [snapshot], lastNotificationId: 12, tickets: [{ id: `boundary-${id}`, token: snapshot.token }] });
  }
  const pending = (await pushStore.listPendingReceipts(NOW)).filter((item) => item.userId === 108);
  assert.deepEqual(pending.map((item) => item.ticketId), ['boundary-due']);
  await pushStore.deleteReceipts([]);
  await pushStore.deleteReceipts(['boundary-due']);
  assert.equal((await pushStore.listPendingReceipts(NOW)).some((item) => item.ticketId === 'boundary-due'), false);
  assert.equal(await pushStore.deleteExpiredReceipts(NOW), 1);
  assert.deepEqual((await database.prepare('SELECT ticket_id FROM push_receipts WHERE user_id = ?').bind(108).all()).results, [{ ticket_id: 'boundary-later' }]);
});

test('the push session migration preserves legacy rows without assigning them to another device', async () => {
  const legacyRuntime = new Miniflare({ d1Databases: { DB: 'legacy-push-test' }, modules: WORKER_MODULES });
  try {
    const legacyDb = await legacyRuntime.getD1Database('DB');
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
    for (const entry of journal.entries.filter((item) => item.idx < 9)) {
      const sql = await readFile(`drizzle/${entry.tag}.sql`, 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await legacyDb.prepare(statement).run();
      }
    }
    await legacyDb.prepare('INSERT INTO users (bangumi_user_id, username, nickname, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(201, 'legacy-owner', 'Legacy owner', NOW, NOW).run();
    await legacyDb.prepare('INSERT INTO push_devices (token, platform, updated_at, user_id, last_notification_id) VALUES (?, ?, ?, ?, ?)')
      .bind('legacy-device', 'ios', NOW, 201, 7).run();
    const migration = journal.entries.find((item) => item.idx === 9);
    const sql = await readFile(`drizzle/${migration.tag}.sql`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await legacyDb.prepare(statement).run();
    }
    const preserved = (await legacyDb.prepare('SELECT * FROM push_devices WHERE token = ?').bind('legacy-device').all()).results[0];
    assert.equal(preserved.last_notification_id, 7);
    assert.equal(preserved.session_id, null);
    assert.equal(preserved.registration_id, null);
    const legacyStore = createD1PushDeviceStore(legacyDb);
    assert.deepEqual(await legacyStore.listByUser(201, NOW), []);
    assert.deepEqual(await legacyStore.listUserIds(NOW), []);
    await seedPushSession('legacy-rebind', 201, { db: legacyDb });
    assert.equal(await legacyStore.save(pushDevice('legacy-device', 201, 'legacy-rebind')), true);
    await createD1AuthStore(legacyDb).deleteSessionById(201, 'legacy-rebind');
    assert.deepEqual((await legacyDb.prepare('SELECT token FROM push_devices').all()).results, []);
  } finally {
    await legacyRuntime.dispose();
  }
});

test('disconnecting credentials removes bound and legacy push data while preserving account preferences and other users', async () => {
  await seedPushSession('disconnect-owner', 109);
  await seedPushSession('disconnect-other', 110);
  const owned = pushDevice('disconnect-device', 109, 'disconnect-owner');
  const other = pushDevice('disconnect-other-device', 110, 'disconnect-other');
  await pushStore.save(owned);
  await pushStore.save(other);
  await pushStore.commitDelivery({ createdAt: NOW - 15 * 60_000, devices: [owned], lastNotificationId: 12,
    tickets: [{ id: 'disconnect-ticket', token: owned.token }] });
  await database.prepare('INSERT INTO push_devices (token, platform, updated_at, user_id) VALUES (?, ?, ?, ?)')
    .bind('disconnect-legacy-device', 'ios', NOW, 109).run();
  await preferencesStore.save({ userId: 109, locale: 'zh-Hans', theme: 'dark', updatedAt: NOW });
  const disconnectStore = createD1AuthStore(database);
  const disconnectCredential = await disconnectStore.getBangumiCredential(109);
  await disconnectStore.deleteBangumiCredential(109, disconnectCredential.connectionId);
  for (const table of ['sessions', 'push_devices', 'push_receipts', 'bangumi_credentials']) {
    const rows = await database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`).bind(109).first();
    assert.equal(rows.count, 0, table);
  }
  assert.equal((await pushStore.listByUser(110, NOW)).length, 1);
  assert.equal((await preferencesStore.get(109)).theme, 'dark');
  assert.equal((await database.prepare('SELECT COUNT(*) AS count FROM users WHERE bangumi_user_id = ?').bind(109).first()).count, 1);
});

test('a re-registration cannot roll back a cursor concurrently advanced after its initial read', async () => {
  await seedPushSession('registration-cursor-race', 111);
  await seedPushSession('registration-rebound', 111);
  const original = pushDevice('registration-cursor-device', 111, 'registration-cursor-race', { lastNotificationId: 10 });
  await pushStore.save(original);
  await pushStore.commitDelivery({ createdAt: NOW, devices: [original], lastNotificationId: 12, tickets: [] });
  await pushStore.save({ ...original, registrationId: 'registration-after-stale-read' });
  assert.equal((await pushStore.listByUser(111, NOW))[0].lastNotificationId, 12);
  await pushStore.save({ ...original, sessionId: 'registration-rebound', registrationId: 'different-session', lastNotificationId: 999 });
  assert.equal((await pushStore.listByUser(111, NOW))[0].lastNotificationId, null);
});

test('missing receipts yield their polling slot to tickets that have not yet been checked', async () => {
  await seedPushSession('receipt-fairness-session', 112);
  const snapshot = pushDevice('receipt-fairness-device', 112, 'receipt-fairness-session');
  await pushStore.save(snapshot);
  await pushStore.commitDelivery({ createdAt: NOW - 20 * 60_000, devices: [snapshot], lastNotificationId: 12,
    tickets: [{ id: 'fairness-first', token: snapshot.token }] });
  await pushStore.commitDelivery({ createdAt: NOW - 16 * 60_000, devices: [snapshot], lastNotificationId: 13,
    tickets: [{ id: 'fairness-second', token: snapshot.token }] });
  // Isolate these two old tickets ahead of prior tests' already-checked tickets.
  await database.prepare('UPDATE push_receipts SET last_checked_at = ? WHERE user_id != ?').bind(NOW, 112).run();
  const first = await pushStore.listPendingReceipts(NOW, 1);
  assert.equal(first[0].ticketId, 'fairness-first');
  await pushStore.markReceiptChecks([first[0].ticketId], NOW);
  const second = await pushStore.listPendingReceipts(NOW, 1);
  assert.equal(second[0].ticketId, 'fairness-second');
});

test('bulk receipt checks and retirement stay below the D1 one-hundred-parameter query limit', async () => {
  await seedPushSession('bulk-receipts', 113);
  const snapshot = pushDevice('bulk-receipt-device', 113, 'bulk-receipts');
  await pushStore.save(snapshot);
  const ids = Array.from({ length: 101 }, (_, index) => `bulk-ticket-${index}`);
  await database.batch(ids.map((id) => database.prepare('INSERT INTO push_receipts (ticket_id, token, user_id, session_id, registration_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, snapshot.token, 113, snapshot.sessionId, snapshot.registrationId, NOW - 16 * 60_000)));
  const parameterCounts = [];
  const boundedDatabase = {
    prepare(sql) {
      const statement = database.prepare(sql);
      return {
        bind(...values) {
          parameterCounts.push(values.length);
          assert.ok(values.length <= 100, `D1 query used ${values.length} parameters`);
          return statement.bind(...values);
        },
      };
    },
    batch(statements) { return database.batch(statements); },
  };
  const boundedStore = createD1PushDeviceStore(boundedDatabase);
  await boundedStore.markReceiptChecks([], NOW);
  await boundedStore.markReceiptChecks(ids, NOW);
  const marked = await database.prepare('SELECT COUNT(*) AS count FROM push_receipts WHERE user_id = ? AND last_checked_at = ?').bind(113, NOW).first();
  assert.equal(marked.count, 101);
  await boundedStore.deleteReceipts(ids);
  assert.equal((await database.prepare('SELECT COUNT(*) AS count FROM push_receipts WHERE user_id = ?').bind(113).first()).count, 0);
  assert.deepEqual(parameterCounts, [100, 3, 100, 1]);
});
