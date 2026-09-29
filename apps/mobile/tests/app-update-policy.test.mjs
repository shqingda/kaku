import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDue, CHECK_INTERVAL, isNewerVersion, parseGithubRelease, shouldRemind, REMIND_INTERVAL } from '../src/features/app-update/update-policy.ts';
test('numeric release versions never downgrade or accept prerelease guesses', () => {
  assert.equal(isNewerVersion('1.1.12', '1.1.9'), true);
  assert.equal(isNewerVersion('1.1.8', '1.1.11'), false);
  assert.equal(isNewerVersion('v2.0.0', '1.99.99'), true);
  assert.equal(isNewerVersion('1.1.11', '1.1.11'), false);
  assert.throws(() => isNewerVersion('1.2.0-beta', '1.1.11'));
});
test('automatic checks and reminders throttle independently and tolerate clock rollback', () => {
  assert.equal(checkDue(100, 101), false);
  assert.equal(checkDue(100, 100 + CHECK_INTERVAL), true);
  assert.equal(checkDue(100, 99), true);
  assert.equal(shouldRemind('2.0.0', { version: '2.0.0', at: 100 }, 101), false);
  assert.equal(shouldRemind('2.0.0', { version: '2.0.0', at: 100 }, 100 + REMIND_INTERVAL), true);
  assert.equal(shouldRemind('2.0.1', { version: '2.0.0', at: 100 }, 101), true);
});
test('only the matching uploaded APK from this repository may be downloaded', () => {
  const release = { tag_name: 'v1.2.0', body: '改进', assets: [{ name: 'kaku-release.apk', state: 'uploaded', size: 123, browser_download_url: 'https://github.com/shqingda/kaku/releases/download/v1.2.0/kaku-release.apk' }] };
  assert.equal(parseGithubRelease(release, 'kaku-release.apk').apk.size, 123);
  assert.throws(() => parseGithubRelease(release, 'kaku-debug.apk'));
  assert.throws(() => parseGithubRelease({ ...release, prerelease: true }, 'kaku-release.apk'));
  assert.throws(() => parseGithubRelease({ ...release, assets: [{ ...release.assets[0], browser_download_url: 'https://evil.invalid/app.apk' }] }, 'kaku-release.apk'));
});
