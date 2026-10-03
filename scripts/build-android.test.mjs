import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function createBuildFixture() {
  const root = mkdtempSync(join(tmpdir(), 'kaku-build-'));
  const mobile = join(root, 'apps/mobile');
  for (const directory of ['scripts', 'bin', 'apps/mobile/android/app/build/outputs/apk/release']) mkdirSync(join(root, directory), { recursive: true });
  for (const file of ['build-android.sh', 'build-split-apks.sh', 'report-apk-size.py']) cpSync(new URL(file, import.meta.url), join(root, 'scripts', file));
  const manifest = JSON.stringify({ scripts: { ios: 'expo run:ios', android: 'expo run:android' }, dependencies: { react: '19' } });
  writeFileSync(join(mobile, 'package.json'), manifest);
  writeFileSync(join(mobile, 'app.config.js'), 'module.exports = { expo: { version: "1.2.3" } };');
  writeFileSync(join(root, 'scripts/release-notes.md'), '- Test release\n');
  const log = join(root, 'commands.jsonl');
  writeFileSync(log, '');
  function stub(command) {
    return `#!/usr/bin/env node
const fs = require('node:fs');
const command = ${JSON.stringify(command)};
const args = process.argv.slice(2);
fs.appendFileSync(process.env.KAKU_TEST_COMMAND_LOG, JSON.stringify({
  command, args,
  profile: process.env.EAS_BUILD_PROFILE,
  optimization: process.env.KAKU_OPTIMIZE_NATIVE,
  updateChannel: process.env.KAKU_UPDATE_CHANNEL,
  sentryUploadDisabled: process.env.SENTRY_DISABLE_AUTO_UPLOAD,
}) + '\\n');
if (command === 'git') {
  const operation = args[0] === '-C' ? args[2] : args[0];
  if (operation === 'diff') process.exit(1);
  if (operation === 'rev-parse') process.stdout.write('0123456789abcdef0123456789abcdef01234567');
}
`;
  }
  for (const command of ['git', 'gh', 'pnpm']) writeFileSync(join(root, 'bin', command), stub(command), { mode: 0o755 });
  writeFileSync(join(mobile, 'android/gradlew'), stub('gradlew'), { mode: 0o755 });
  writeFileSync(join(root, 'scripts/sync-changelog.mjs'), stub('sync-changelog').replace("const fs = require('node:fs');", "import fs from 'node:fs';"));
  const apk = join(mobile, 'android/app/build/outputs/apk/release/app-release.apk');
  const fixture = spawnSync('python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],"w") as z: z.writestr("classes.dex", b"test")', apk]);
  assert.equal(fixture.status, 0);
  return {
    root, mobile, manifest,
    run(script, args, optimization = '0') {
      writeFileSync(log, '');
      return spawnSync('bash', [join(root, 'scripts', script), ...args], {
        env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, KAKU_TEST_COMMAND_LOG: log, KAKU_OPTIMIZE_NATIVE: optimization },
        encoding: 'utf8',
      });
    },
    commands() {
      return readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

function assertBuild(fixture, result, { profile, optimization, artifact }) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFileSync(join(fixture.mobile, 'package.json'), 'utf8'), fixture.manifest);
  assert.ok(readFileSync(join(fixture.mobile, 'dist-split', artifact)).length);
  const commands = fixture.commands();
  const prebuild = commands.find(entry => entry.command === 'pnpm');
  assert.deepEqual(prebuild.args.slice(0, 3), ['exec', 'expo', 'prebuild']);
  assert.equal(prebuild.profile, profile);
  assert.equal(prebuild.optimization, optimization);
  assert.equal(prebuild.updateChannel, 'github');
  assert.equal(prebuild.sentryUploadDisabled, 'true');
  const gradle = commands.find(entry => entry.command === 'gradlew');
  assert.equal(gradle.optimization, optimization);
  assert.deepEqual(gradle.args, [':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a']);
}

test('local release builds default to shrinking despite stale environment settings, without publishing', () => {
  const fixture = createBuildFixture();
  try {
    const cases = [
      { args: [], profile: 'production', optimization: '1', artifact: 'kaku-release.apk', flag: '0' },
      { args: ['release'], profile: 'production', optimization: '1', artifact: 'kaku-release.apk', flag: '0' },
      { args: ['release', '--optimized'], profile: 'production', optimization: '1', artifact: 'kaku-release-optimized.apk', flag: '0' },
      { args: ['release', '--no-optimize'], profile: 'production', optimization: '0', artifact: 'kaku-release-unoptimized.apk', flag: '1' },
      { args: ['debug'], profile: '', optimization: '0', artifact: 'kaku-debug.apk', flag: '1' },
    ];
    for (const entry of cases) {
      writeFileSync(join(fixture.mobile, '.env'), `KAKU_OPTIMIZE_NATIVE=${entry.flag}\n`);
      const result = fixture.run('build-android.sh', entry.args, entry.flag);
      assertBuild(fixture, result, entry);
      assert.deepEqual(fixture.commands().map(entry => entry.command), ['pnpm', 'gradlew'], 'pure builds must not sync, commit, push or publish');
    }
    const result = fixture.run('build-android.sh', ['debug', '--optimized']);
    assert.equal(result.status, 2, 'a debug package cannot be mislabeled as optimized');
    assert.deepEqual(fixture.commands(), []);
  } finally {
    fixture.cleanup();
  }
});

test('legacy build-only uses release defaults and never reaches publishing tools', () => {
  const fixture = createBuildFixture();
  try {
    writeFileSync(join(fixture.mobile, '.env'), 'KAKU_OPTIMIZE_NATIVE=0\n');
    for (const args of [['--build-only'], ['v1.2.3', 'release', '--build-only']]) {
      const result = fixture.run('build-split-apks.sh', args);
      assertBuild(fixture, result, { profile: 'production', optimization: '1', artifact: 'kaku-release.apk' });
      assert.deepEqual(fixture.commands().map(entry => entry.command), ['pnpm', 'gradlew']);
    }
  } finally {
    fixture.cleanup();
  }
});

test('release publishing accepts shrinking and uploads the standard APK name', () => {
  const fixture = createBuildFixture();
  try {
    for (const flag of ['0', '1']) {
      writeFileSync(join(fixture.mobile, '.env'), `KAKU_OPTIMIZE_NATIVE=${flag}\n`);
      const result = fixture.run('build-split-apks.sh', ['v1.2.3', 'release'], flag);
      assertBuild(fixture, result, { profile: 'production', optimization: '1', artifact: 'kaku-release.apk' });
      const commands = fixture.commands();
      assert.equal(commands[0].command, 'sync-changelog');
      const gitOperations = commands.filter(entry => entry.command === 'git').map(entry => entry.args.slice(2));
      assert.deepEqual(gitOperations.map(args => args[0]), ['diff', 'add', 'commit', 'push', 'rev-parse']);
      assert.deepEqual(gitOperations.find(args => args[0] === 'push'), ['push', 'origin', 'HEAD:main']);
      const upload = commands.find(entry => entry.command === 'gh');
      assert.deepEqual(upload.args, [
        'release', 'create', 'v1.2.3', join(fixture.mobile, 'dist-split/kaku-release.apk'),
        '--repo', 'shqingda/kaku', '--title', 'v1.2.3',
        '--notes-file', join(fixture.root, 'scripts/release-notes.md'),
        '--target', '0123456789abcdef0123456789abcdef01234567',
      ]);
      assert.ok(commands.findIndex(entry => entry.command === 'gradlew') < commands.findIndex(entry => entry.command === 'git' && entry.args[2] === 'push'));
    }
  } finally {
    fixture.cleanup();
  }
});

function readConfig(profile, flag, extraEnv = {}) {
  const env = { ...process.env, EAS_BUILD_PROFILE: profile, KAKU_UPDATE_CHANNEL: '', ...extraEnv };
  if (flag === undefined) delete env.KAKU_OPTIMIZE_NATIVE;
  else env.KAKU_OPTIMIZE_NATIVE = flag;
  const result = spawnSync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(require("./apps/mobile/app.config.js").expo))'], {
    cwd: new URL('..', import.meta.url), env, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('production profiles shrink by default and support an explicit diagnostic opt-out', () => {
  for (const profile of ['production', 'github', 'development', '']) {
    for (const flag of [undefined, '', '1', '0']) {
      const config = readConfig(profile, flag);
      const properties = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')[1];
      const expected = ['production', 'github'].includes(profile) && flag !== '0';
      assert.equal(properties.android.enableMinifyInReleaseBuilds, expected, `R8: profile=${profile}, flag=${flag}`);
      assert.equal(properties.android.enableShrinkResourcesInReleaseBuilds, expected, `resources: profile=${profile}, flag=${flag}`);
      assert.equal(properties.ios.enableSceneSupport, true);
    }
  }
});

test('cloud profiles retain shrinking defaults while separating store and GitHub distribution', () => {
  const eas = JSON.parse(readFileSync(new URL('../apps/mobile/eas.json', import.meta.url), 'utf8'));
  assert.equal(eas.build.github.extends, 'production');
  assert.equal(eas.build.github.android.buildType, 'apk');
  assert.equal(eas.build.production.android?.buildType, undefined);
  for (const profile of ['production', 'github', 'development']) {
    const parent = eas.build[profile].extends;
    const profileEnv = { ...(parent ? eas.build[parent].env : {}), ...eas.build[profile].env };
    const production = profile !== 'development';
    if (production) assert.equal(profileEnv.KAKU_OPTIMIZE_NATIVE, '1');
    const config = readConfig(profile, profileEnv.KAKU_OPTIMIZE_NATIVE, profileEnv);
    assert.equal(config.android.package, production ? 'com.shqingda.kaku' : 'com.shqingda.kaku.debug');
    assert.equal(config.android.permissions.includes('android.permission.REQUEST_INSTALL_PACKAGES'), profile === 'github');
    const properties = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')[1];
    assert.equal(properties.android.enableMinifyInReleaseBuilds, production);
    assert.equal(properties.android.enableShrinkResourcesInReleaseBuilds, production);
  }
});
