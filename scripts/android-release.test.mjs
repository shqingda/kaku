import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublishable } from './android-release.mjs';
const names = ['smoke', 'regression', 'signedOut', 'signedIn', 'keyboardAndBack', 'permissions', 'oauthAndDeepLinks', 'sentry', 'upgrade'];
const manifest = { commit: 'commit-a', sha256: 'hash-a', packageName: 'com.shqingda.kaku' };
const report = () => ({ ...manifest, checks: Object.fromEntries(names.map(name => [name, { status: 'passed', evidence: 'device test record' }])) });
test('accepts the exact tested artifact and commit', () => assert.doesNotThrow(() => assertPublishable(manifest, report(), 'hash-a', 'commit-a')));
test('rejects replaced artifact or changed source', () => {
  assert.throws(() => assertPublishable(manifest, report(), 'hash-b', 'commit-a'));
  assert.throws(() => assertPublishable(manifest, report(), 'hash-a', 'commit-b'));
});
test('skipped, unverified, failed or undocumented checks cannot publish', () => {
  for (const name of names) {
    for (const status of ['skipped', 'unverified', 'failed']) {
      const value = report(); value.checks[name].status = status;
      assert.throws(() => assertPublishable(manifest, value, 'hash-a', 'commit-a'));
    }
    const value = report(); value.checks[name].evidence = '';
    assert.throws(() => assertPublishable(manifest, value, 'hash-a', 'commit-a'));
  }
});
