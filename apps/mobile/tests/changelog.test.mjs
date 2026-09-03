import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import { CHANGELOG } from '../src/features/changelog/changelog-data.ts';
import {
  formatChangelogSource,
  isInstallNote,
  parseChangelogSource,
  parseUserNotes,
  syncChangelogEntries,
  syncChangelogFiles,
  todayStamp,
} from '../../../scripts/sync-changelog.mjs';

const require = createRequire(import.meta.url);
const APP_VERSION = require('../app.config.js').expo.version;

test('changelog data stays well-formed, newest first, and matches the app version', () => {
  assert.ok(CHANGELOG.length >= 2);

  const versions = CHANGELOG.map((entry) => entry.version);
  assert.equal(new Set(versions).size, versions.length, '版本号不应重复');
  assert.equal(
    CHANGELOG[0].version,
    APP_VERSION,
    '最新一条必须等于 app.config.js 的 version，发版前跑 scripts/sync-changelog.mjs',
  );

  for (const entry of CHANGELOG) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.notes.length > 0);
    for (const note of entry.notes) {
      assert.ok(note.trim().length > 0);
      assert.equal(isInstallNote(note), false, `安装提示不应出现在 App 内日志: ${note}`);
    }
  }

  for (let index = 1; index < CHANGELOG.length; index += 1) {
    const previous = CHANGELOG[index - 1];
    const current = CHANGELOG[index];
    const older =
      previous.date > current.date ||
      (previous.date === current.date &&
        compareVersions(previous.version, current.version) > 0);
    assert.ok(older, `${previous.version} 应排在 ${current.version} 之前`);
  }
});

test('todayStamp uses the local calendar date', () => {
  assert.equal(todayStamp(new Date(2026, 8, 4, 12)), '2026-09-04');
});

test('parseUserNotes keeps product bullets and drops install-only lines', () => {
  const notes = parseUserNotes(`
- 新增分享入口
- v1.1.1 可直接覆盖安装
- 安装前请先卸载旧版（签名与旧包不同）
- 修复深色模式白屏
`);
  assert.deepEqual(notes, ['新增分享入口', '修复深色模式白屏']);
});

test('sync prepends the current version and leaves an existing top entry alone', () => {
  const existing = [
    { version: '1.1.1', date: '2026-09-01', notes: ['快捷方式图标'] },
    { version: '1.0.10', date: '2026-08-29', notes: ['更新日志页'] },
  ];

  const inserted = syncChangelogEntries(existing, {
    version: '1.1.2',
    date: '2026-09-04',
    notes: ['骨架屏不再跳动'],
  });
  assert.equal(inserted.didInsert, true);
  assert.equal(inserted.entries[0].version, '1.1.2');
  assert.equal(inserted.entries[1].version, '1.1.1');

  const skipped = syncChangelogEntries(inserted.entries, {
    version: '1.1.2',
    date: '2026-09-05',
    notes: ['这段不应覆盖已有说明'],
  });
  assert.equal(skipped.didInsert, false);
  assert.equal(skipped.entries[0].notes[0], '骨架屏不再跳动');
});

test('sync refuses a current version that is buried under newer entries', () => {
  assert.throws(
    () =>
      syncChangelogEntries(
        [
          { version: '1.1.2', date: '2026-09-04', notes: ['新'] },
          { version: '1.1.1', date: '2026-09-01', notes: ['旧'] },
        ],
        { version: '1.1.1', date: '2026-09-01', notes: ['旧'] },
      ),
    /不在最上方/,
  );
});

test('changelog source round-trips through parse and format', () => {
  const source = formatChangelogSource([
    { version: '1.1.2', date: '2026-09-04', notes: ["修复按钮的 '按下' 反馈"] },
    { version: '1.0.10', date: '2026-08-29', notes: ['新增「更新日志」'] },
  ]);
  const parsed = parseChangelogSource(source);
  assert.equal(parsed[0].notes[0], "修复按钮的 '按下' 反馈");
  assert.equal(parseChangelogSource(formatChangelogSource(parsed))[0].version, '1.1.2');
});

test('syncChangelogFiles writes the current app version from release notes', () => {
  const original = formatChangelogSource([
    { version: '1.0.10', date: '2026-08-29', notes: ['更新日志页'] },
  ]);
  const result = syncChangelogFiles({
    version: '1.1.2',
    date: '2026-09-04',
    notesMarkdown: '- 首页冷启动更快\n- v1.1.1 可直接覆盖安装\n',
    changelogSource: original,
  });
  assert.equal(result.didInsert, true);
  const parsed = parseChangelogSource(result.changelogSource);
  assert.equal(parsed[0].version, '1.1.2');
  assert.equal(parsed[0].date, '2026-09-04');
  assert.deepEqual(parsed[0].notes, ['首页冷启动更快']);
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (pa[index] !== pb[index]) return pa[index] - pb[index];
  }
  return 0;
}
