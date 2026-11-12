import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'kaku-ci-test-')));
  for (const dir of ['scripts', 'bin', 'apps/mobile']) mkdirSync(join(root, dir), { recursive: true });
  cpSync(new URL('ci-check.sh', import.meta.url), join(root, 'scripts/ci-check.sh'));
  const log = join(root, 'commands');
  writeFileSync(log, '');
  writeFileSync(join(root, 'bin/pnpm'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.KAKU_TEST_LOG, JSON.stringify({ args, cwd: process.cwd(), ci: process.env.CI }) + '\\n');
if (args.includes(process.env.KAKU_TEST_FAIL)) process.exit(7);
`, { mode: 0o755 });
  return {
    root,
    run(args = [], fail = '') {
      return spawnSync('bash', [join(root, 'scripts/ci-check.sh'), ...args], {
        cwd: tmpdir(), encoding: 'utf8',
        env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, KAKU_TEST_LOG: log, KAKU_TEST_FAIL: fail },
      });
    },
    commands: () => readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('default, all and verify run each test group once without native builds', () => {
  for (const args of [[], ['all'], ['verify']]) {
    const f = fixture();
    try {
      const result = f.run(args);
      assert.equal(result.status, 0, result.stderr);
      const commands = f.commands();
      assert.deepEqual(commands[0].args, ['install', '--frozen-lockfile']);
      assert.deepEqual(commands.filter(c => c.args.some(arg => /^test(?::|$)/.test(arg))).map(c => c.args), [
        ['--filter', '@kaku/shared', 'test'],
        ['test:tooling'],
        ['--filter', '@kaku/api', 'test:coverage'],
        ['--filter', '@kaku/mobile', 'test:coverage'],
        ['--filter', '@kaku/mobile', 'test:ui'],
      ]);
      for (const gate of ['typecheck', 'build:web']) {
        assert.ok(commands.some(c => c.args.includes(gate)), gate);
      }
      assert.deepEqual(commands.filter(c => c.args.includes('export')).map(c => c.args[c.args.indexOf('--platform') + 1]), ['ios', 'android']);
      assert.equal(commands.find(c => c.args.includes('expo-doctor@1.21.6')).cwd, join(f.root, 'apps/mobile'));
      assert.ok(commands.every(c => c.ci === '1'));
      assert.ok(commands.every(c => !c.args.includes('build:android')));
    } finally { f.cleanup(); }
  }
});

test('a failed gate stops later checks and returns its exit status', () => {
  const f = fixture();
  try {
    const result = f.run([], 'typecheck');
    assert.equal(result.status, 7);
    assert.equal(f.commands().at(-1).args[0], 'typecheck');
    assert.match(result.stderr, /typecheck/);
  } finally { f.cleanup(); }
});

test('HTML regression stays available on request; invalid arguments do no work', () => {
  for (const args of [['html'], ['invalid'], ['verify', 'html']]) {
    const f = fixture();
    try {
      const valid = args.length === 1 && args[0] === 'html';
      const result = f.run(args);
      assert.equal(result.status, valid ? 0 : 2, result.stderr);
      const commands = f.commands();
      assert.deepEqual(commands.map(c => c.args), valid ? [
        ['install', '--frozen-lockfile'],
        ['--filter', '@kaku/api', 'test:html-parsers'],
      ] : []);
    } finally { f.cleanup(); }
  }
});
