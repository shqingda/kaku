import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('legacy build-only and candidate builds never sync, commit or publish', () => {
  const root = mkdtempSync(join(tmpdir(), 'kaku-build-'));
  try {
    for (const directory of ['scripts', 'bin', 'apps/mobile/android/app/build/outputs/apk/release']) mkdirSync(join(root, directory), { recursive: true });
    for (const file of ['build-android.sh', 'build-split-apks.sh', 'report-apk-size.py']) cpSync(new URL(file, import.meta.url), join(root, 'scripts', file));
    const mobile = join(root, 'apps/mobile');
    const manifest = JSON.stringify({ scripts: { ios: 'expo run:ios', android: 'expo run:android' }, dependencies: { react: '19' } });
    writeFileSync(join(mobile, 'package.json'), manifest);
    writeFileSync(join(mobile, 'app.config.js'), 'module.exports = { expo: { version: "1.2.3" } };');
    writeFileSync(join(root, 'scripts/sync-changelog.mjs'), 'throw new Error("must not sync");');
    for (const command of ['git', 'gh']) writeFileSync(join(root, 'bin', command), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
    writeFileSync(join(root, 'bin/pnpm'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    writeFileSync(join(mobile, 'android/gradlew'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const apk = join(mobile, 'android/app/build/outputs/apk/release/app-release.apk');
    const fixture = spawnSync('python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],"w") as z: z.writestr("classes.dex", b"test")', apk]);
    assert.equal(fixture.status, 0);
    const env = { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` };
    for (const args of [['build-split-apks.sh', 'v1.2.3', 'release', '--build-only'], ['build-android.sh', 'release', '--optimized']]) {
      const result = spawnSync('bash', [join(root, 'scripts', args[0]), ...args.slice(1)], { env, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.equal(readFileSync(join(mobile, 'package.json'), 'utf8'), manifest);
    }
    assert.ok(readFileSync(join(mobile, 'dist-split/kaku-release.apk')).length);
    assert.ok(readFileSync(join(mobile, 'dist-split/kaku-release-optimized.apk')).length);
    const result = spawnSync('bash', [join(root, 'scripts/build-split-apks.sh'), 'v1.2.3'], { env: { ...env, KAKU_OPTIMIZE_NATIVE: '1' } });
    assert.equal(result.status, 2, 'candidate cannot use the release path');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('native shrinking is opt-in and restricted to the production package', () => {
  for (const [profile, flag, expected] of [['production', '', false], ['production', '1', true], ['', '1', false]]) {
    const result = spawnSync(process.execPath, ['-e', 'const c=require("./apps/mobile/app.config.js").expo; process.stdout.write(JSON.stringify(c.plugins.find(p=>Array.isArray(p)&&p[0]==="expo-build-properties")[1]));'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, EAS_BUILD_PROFILE: profile, KAKU_OPTIMIZE_NATIVE: flag },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const properties = JSON.parse(result.stdout);
    assert.equal(properties.android.enableMinifyInReleaseBuilds, expected);
    assert.equal(properties.android.enableShrinkResourcesInReleaseBuilds, expected);
    assert.equal(properties.ios.enableSceneSupport, true);
  }
});
