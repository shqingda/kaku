import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iosDevice = 'A395E274-D899-42DA-BE4C-416A9F89F671';
const flows = { ios: 'kaku-smoke-ios.yaml', android: 'kaku-smoke-android.yaml', reply: 'reply-sheet-accessibility-ios.yaml' };

export function invocation(mode, serial, env = process.env, repo = root) {
  if (!['check', ...Object.keys(flows)].includes(mode) || (mode !== 'android' && serial) || (mode === 'android' && (!serial || serial.startsWith('-') || serial.includes(',')))) {
    throw new Error('用法：pnpm test:e2e check | ios | reply | android <设备序列号>');
  }
  const base = join(repo, '.cache/maestro');
  const output = join(base, 'results', mode);
  const localEnv = { ...env, MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    XDG_STATE_HOME: join(base, 'state'), XDG_CACHE_HOME: join(base, 'cache'),
    XDG_CONFIG_HOME: join(base, 'config'), TMPDIR: join(base, 'tmp'),
    // 不覆盖 HOME；Java 自身的旧版 home 回退也留在项目中。
    JAVA_TOOL_OPTIONS: `${env.JAVA_TOOL_OPTIONS ?? ''} -Duser.home="${join(base, 'java-home')}" -Djava.io.tmpdir="${join(base, 'tmp')}"`,
  };
  const args = mode === 'check'
    ? ['check-syntax', join(repo, '.maestro', flows.ios)]
    : ['--device', mode === 'android' ? serial : iosDevice, 'test', '--format', 'JUNIT', '--output', join(output, 'report.xml'), '--debug-output', join(output, 'debug'), '--flatten-debug-output', '--test-output-dir', join(output, 'artifacts'), join(repo, '.maestro', flows[mode])];
  return { binary: join(base, 'cli/maestro/bin/maestro'), args, env: localEnv, output, base };
}

function main() {
  if (process.argv.length > 4) throw new Error('不接受额外 Maestro 参数；只运行项目内明确选择的流程。');
  const mode = process.argv[2];
  const run = invocation(mode, process.argv[3]);
  if (!existsSync(run.binary)) throw new Error('缺少项目内 Maestro CLI，请按 docs/development/testing.md 安装；不会回退到全局命令。');
  if (mode === 'ios' || mode === 'reply') {
    const listed = spawnSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { encoding: 'utf8' });
    if (listed.status !== 0) throw new Error('无法列出 iOS 设备。');
    const device = Object.values(JSON.parse(listed.stdout).devices).flat().find(d => d.udid === iosDevice);
    if (!device || device.state !== 'Booted') throw new Error('指定 iOS 模拟器缺失或未启动；请先运行 pnpm dev:sim，不创建或清空设备。');
    console.log('保留登录与数据；鉴权专项前请由用户重新登录，reply 不发送或清空草稿。');
  }
  for (const dir of [run.output, run.env.XDG_STATE_HOME, run.env.XDG_CACHE_HOME, run.env.XDG_CONFIG_HOME, run.env.TMPDIR, join(run.base, 'java-home')]) mkdirSync(dir, { recursive: true });
  console.log(`Maestro 输出：${run.output}`);
  const commands = mode === 'check'
    ? Object.values(flows).map(file => ['check-syntax', join(root, '.maestro', file)])
    : [run.args];
  for (const args of commands) {
    const result = spawnSync(run.binary, args, { cwd: root, env: run.env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; return; }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
