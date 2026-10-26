import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { reportUnusedExports } from './report-unused-exports.mjs';

test('the export report separates dead, file-local and test-only exports', t => {
  const root = mkdtempSync(join(tmpdir(), 'kaku-export-report-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  write('apps/mobile/src/a.ts', [
    'export function used() {}',
    'export const dead = 1;',
    'export const local = 2;',
    'export const forTests = 3;',
    'const value = local;',
  ].join('\n'));
  write('apps/mobile/src/b.ts', "import { used } from './a';\nused();");
  write('apps/mobile/tests/a.test.mjs', 'forTests;');

  assert.deepEqual(reportUnusedExports(root), {
    dead: ['apps/mobile/src/a.ts:2 dead'],
    fileLocal: ['apps/mobile/src/a.ts:3 local'],
    testOnly: ['apps/mobile/src/a.ts:4 forTests'],
  });
});
