import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { reportWorkspaceFiles } from './report-workspace-files.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'kaku-file-report-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content = 'keep') => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  return { root, write };
}

test('the report separates allowlisted sources, artifacts and dependencies without including protected files', t => {
  const { root, write } = fixture(t);
  write('apps/mobile/src/index.ts', 'source');
  write('apps/web/dist/index.html', 'built');
  write('node_modules/package/index.js', 'dependency');
  const protectedPaths = [
    'apps/web/dist/verified.apk', 'apps/web/dist/release.aab',
    'apps/web/dist/signing/release.json', 'apps/web/dist/release.p12',
    'apps/web/dist/.env.local', 'apps/web/dist/.xcode.env',
    'apps/web/dist/tutorial/example.ts', 'apps/web/dist/CoreSimulator/data',
    'apps/mobile/ios/Kaku/main.m', 'apps/api/.wrangler/state/local.sqlite',
  ];
  protectedPaths.forEach(path => write(path));

  const report = reportWorkspaceFiles(root);
  assert.deepEqual(report.entries.filter(entry => entry.status === 'present').map(entry => ({
    path: entry.path, category: entry.category, files: entry.files, bytes: entry.logicalBytes,
  })), [
    { path: 'apps/mobile/src', category: 'source', files: 1, bytes: 6 },
    { path: 'apps/web/dist', category: 'artifact', files: 1, bytes: 5 },
    { path: 'node_modules', category: 'dependency', files: 1, bytes: 10 },
  ]);
  assert.equal(report.entries.find(entry => entry.path === 'apps/web/dist').excludedEntries, 8);
  protectedPaths.forEach(path => assert.equal(readFileSync(join(root, path), 'utf8'), 'keep'));
});

test('symlink files, directories and allowlist ancestors are never followed', t => {
  const { root, write } = fixture(t);
  write('external/source.ts', 'outside');
  mkdirSync(join(root, 'apps/mobile/src'), { recursive: true });
  symlinkSync(join(root, 'external'), join(root, 'apps/mobile/src/linked-directory'));
  symlinkSync(join(root, 'external/source.ts'), join(root, 'apps/mobile/src/linked-file'));
  symlinkSync(join(root, 'external'), join(root, 'packages'));
  const report = reportWorkspaceFiles(root);
  const source = report.entries.find(entry => entry.path === 'apps/mobile/src');
  assert.equal(source.files, 0);
  assert.equal(source.excludedEntries, 2);
  assert.equal(report.entries.find(entry => entry.path === 'packages/shared/src').status, 'excluded');
});

test('the CLI rejects mutation flags and does not modify files', t => {
  const { root, write } = fixture(t);
  write('marker', 'keep');
  const result = spawnSync(process.execPath, [
    new URL('./report-workspace-files.mjs', import.meta.url).pathname, '--delete',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /只读/);
  assert.equal(readFileSync(join(root, 'marker'), 'utf8'), 'keep');
});
