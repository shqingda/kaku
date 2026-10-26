import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { compareWithBaseline, countRawDesignValues } from './check-design-tokens.mjs';

test('counts raw font sizes and spacing numbers but not tokens', t => {
  const root = mkdtempSync(join(tmpdir(), 'kaku-design-tokens-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'feature'));
  writeFileSync(join(root, 'feature/a.tsx'), [
    'const styles = { title: { fontSize: 17, marginTop: 8, paddingHorizontal: 12, gap: 4 } };',
    'const tokens = { body: { ...TYPE.body, padding: SPACING.md, gap: SPACING.sm } };',
  ].join('\n'));
  writeFileSync(join(root, 'notes.md'), 'fontSize: 99');

  assert.deepEqual(countRawDesignValues(root), { fontSize: 1, spacing: 3 });
});

test('fails only when a count grows past the baseline', () => {
  const [fontSize, spacing] = compareWithBaseline({ fontSize: 5, spacing: 2 }, { fontSize: 4, spacing: 3 });
  assert.equal(fontSize.increased, true);
  assert.equal(spacing.decreased, true);
  assert.throws(() => compareWithBaseline({ fontSize: 1 }, {}));
});

test('the repository stays within the recorded baseline', () => {
  const baseline = JSON.parse(readFileSync(new URL('./baselines/design-tokens.json', import.meta.url), 'utf8'));
  const counts = countRawDesignValues(new URL('../apps/mobile/src', import.meta.url).pathname);
  assert.ok(compareWithBaseline(counts, baseline).every(result => !result.increased), JSON.stringify(counts));
});
