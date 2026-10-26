import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPerformance } from './check-performance.mjs';
const profilerBaseline = JSON.parse(readFileSync(new URL('./baselines/ios-2026-09-04.json', import.meta.url), 'utf8'));
const base = { device: 'iPhone 17 Pro', os: 'iOS 26.5', mode: 'development', flow: '.maestro/kaku-profile-ios.yaml', subjectMountMs: [93, 95, 92], charactersMountMs: [76, 77, 74], charactersUpdateMs: [60, 61, 59] };
test('accepts baseline median and rejects sustained regression', () => {
  assert.ok(checkPerformance(base, profilerBaseline).every(item => item.passed));
  assert.equal(checkPerformance({ ...base, charactersUpdateMs: [90, 60, 100] }, profilerBaseline)[2].passed, false);
});
test('rejects mismatched environments and incomplete or invalid samples', () => {
  for (const change of [{ os: 'iOS 27.0' }, { mode: 'production' }, { subjectMountMs: [1, 2] }, { subjectMountMs: [1, 2, NaN] }, { subjectMountMs: [0, 2, 3] }]) {
    assert.throws(() => checkPerformance({ ...base, ...change }, profilerBaseline));
  }
});

test('accepts an explicit same-environment baseline with home measurements', () => {
  const baseline = { device: 'iPhone 18 Pro', os: 'iOS 27.0', mode: 'development', flow: 'home', budgetRatio: 1.25, metrics: { homeMountMs: 40 } };
  const report = { ...baseline, homeMountMs: [45, 49, 60] };
  assert.deepEqual(checkPerformance(report, baseline), [{ metric: 'homeMountMs', median: 49, limit: 50, passed: true }]);
  assert.throws(() => checkPerformance(report));
  for (const change of [{ budgetRatio: 0 }, { budgetRatio: Infinity }, { metrics: {} }, { metrics: { homeMountMs: -1 } }, { metrics: [] }]) {
    assert.throws(() => checkPerformance(report, { ...baseline, ...change }));
  }
});

test('keeps the historical profiler limits', () => {
  assert.deepEqual(checkPerformance(base, profilerBaseline).map(item => item.limit), [116.33, 94.83, 75.37]);
});

test('defaults to the Release cold launch baseline', () => {
  const report = { device: 'iPhone 18 Pro', os: 'iOS 27.0', mode: 'release', flow: 'cold-launch-diagnostics', firstLayoutMs: [76, 79, 94], cacheRestoredMs: [88, 93, 107], homeReadyMs: [154, 127, 121] };
  assert.ok(checkPerformance(report).every(item => item.passed));
  assert.equal(checkPerformance({ ...report, homeReadyMs: [170, 175, 180] })[2].passed, false);
  assert.throws(() => checkPerformance(base));
});
