import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPerformance } from './check-performance.mjs';
const base = { device: 'iPhone 17 Pro', os: 'iOS 26.5', mode: 'development', flow: '.maestro/kaku-profile-ios.yaml', subjectMountMs: [93, 95, 92], charactersMountMs: [76, 77, 74], charactersUpdateMs: [60, 61, 59] };
test('accepts baseline median and rejects sustained regression', () => {
  assert.ok(checkPerformance(base).every(item => item.passed));
  assert.equal(checkPerformance({ ...base, charactersUpdateMs: [90, 60, 100] })[2].passed, false);
});
test('rejects mismatched environments and incomplete or invalid samples', () => {
  for (const change of [{ os: 'iOS 27.0' }, { mode: 'production' }, { subjectMountMs: [1, 2] }, { subjectMountMs: [1, 2, NaN] }, { subjectMountMs: [0, 2, 3] }]) {
    assert.throws(() => checkPerformance({ ...base, ...change }));
  }
});
