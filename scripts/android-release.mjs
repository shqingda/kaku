// Optional APK provenance / device checks. Daily GitHub releases do not use this
// as a publish gate; `scripts/build-split-apks.sh` pushes and creates the Release.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
})?.trim() ?? '';
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const head = () => run('git', ['rev-parse', 'HEAD']);
function requireClean() {
  if (run('git', ['status', '--porcelain'])) throw new Error('源码未提交，无法建立发布依据');
}
function buildTool(name) {
  const sdk = process.env.ANDROID_HOME || join(homedir(), 'Library/Android/sdk');
  const folder = join(sdk, 'build-tools');
  const version = readdirSync(folder).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .find((version) => existsSync(join(folder, version, name)));
  if (!version) throw new Error(`缺少 Android build tool: ${name}`);
  return join(folder, version, name);
}
function describe(apk) {
  const badging = run(buildTool('aapt'), ['dump', 'badging', apk]);
  const pkg = badging.match(/package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/);
  const cert = run(buildTool('apksigner'), ['verify', '--print-certs', apk])
    .match(/Signer #1 certificate SHA-256 digest: (.+)/);
  if (!pkg || !cert) throw new Error('APK 元数据或签名无法读取');
  return { sha256: sha(apk), packageName: pkg[1], versionCode: pkg[2], version: pkg[3], certificateSha256: cert[1] };
}
export function assertPublishable(manifest, report, actual, commit) {
  if (manifest.commit !== commit || report.commit !== commit || report.sha256 !== actual || manifest.sha256 !== actual) {
    throw new Error('源码提交或 APK 哈希与验收记录不一致');
  }
  if (manifest.packageName !== 'com.shqingda.kaku') throw new Error('只能发布 release 渠道');
  for (const name of ['smoke', 'regression', 'signedOut', 'signedIn', 'keyboardAndBack', 'permissions', 'oauthAndDeepLinks', 'sentry', 'upgrade']) {
    if (report.checks?.[name]?.status !== 'passed' || !report.checks[name].evidence?.trim()) {
      throw new Error(`验收尚未通过或缺少证据: ${name}`);
    }
  }
}
function main() {
  const [mode, input, serial, ...extra] = process.argv.slice(2);
  if (!['manifest', 'verify', 'publish'].includes(mode) || !input || extra.length || (mode === 'verify' ? !serial : !!serial)) {
    throw new Error('用法: node scripts/android-release.mjs manifest|publish APK；verify APK DEVICE_SERIAL');
  }
  const apk = resolve(input);
  const manifestPath = `${apk}.manifest.json`;
  const reportPath = `${apk}.acceptance.json`;
  const metadata = describe(apk);
  if (mode === 'manifest') {
    requireClean();
    save(manifestPath, { ...metadata, commit: head(), createdAt: new Date().toISOString() });
    return;
  }
  if (mode === 'publish') {
    requireClean();
    const env = { ...process.env };
    for (const name of ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY']) delete env[name];
    run('git', ['push', 'origin', 'HEAD:main'], { env, stdio: 'inherit' });
    run('gh', ['release', 'create', `v${metadata.version}`, apk, '--repo', 'shqingda/kaku', '--title', `v${metadata.version}`, '--notes-file', 'scripts/release-notes.md', '--target', head()], { env, stdio: 'inherit' });
    return;
  }
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath)) : null;
  if (manifest && manifest.sha256 !== metadata.sha256) throw new Error('APK 与构建清单不一致');
  const report = { ...metadata, commit: manifest?.commit ?? null, createdAt: new Date().toISOString(), serial, checks: {} };
  for (const name of ['smoke', 'regression', 'signedOut', 'signedIn', 'keyboardAndBack', 'permissions', 'oauthAndDeepLinks', 'sentry', 'upgrade']) {
    report.checks[name] = { status: 'unverified', evidence: '' };
  }
  const artifacts = `${apk}.evidence/${Date.now()}`;
  mkdirSync(artifacts, { recursive: true });
  const adb = (...args) => run('adb', ['-s', serial, ...args]);
  try {
    if (metadata.packageName !== 'com.shqingda.kaku') throw new Error('需要 com.shqingda.kaku release APK');
    if (!adb('shell', 'getprop', 'ro.product.cpu.abilist').split(',').includes('arm64-v8a')) throw new Error('设备不支持 arm64-v8a');
    report.device = { model: adb('shell', 'getprop', 'ro.product.model'), android: adb('shell', 'getprop', 'ro.build.version.release') };
    // -r preserves application data. Never uninstall on signature mismatch.
    const install = adb('install', '-r', apk);
    if (!install.includes('Success')) throw new Error(`安装失败: ${install}`);
    report.install = install;
    for (const [name, flow] of [['smoke', 'kaku-smoke-android.yaml'], ['regression', 'kaku-regression-android.yaml']]) {
      const output = join(artifacts, name);
      try {
        run('maestro', ['--device', serial, 'test', '--format', 'junit', '--output', `${output}.xml`, '--debug-output', output, `.maestro/${flow}`]);
        report.checks[name] = { status: 'passed', evidence: `${output}.xml（登录门控分支须单独验收）` };
      } catch (error) {
        report.checks[name] = { status: 'failed', evidence: `${output}: ${error.stderr?.toString() || error.message}` };
        throw error;
      }
    }
  } catch (error) {
    report.blocker = error.message;
    throw error;
  } finally {
    save(reportPath, report);
    console.log(`验收记录: ${reportPath}；未验证项目不能视为通过。`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
