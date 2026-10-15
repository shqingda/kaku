import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchSimulator, DEVICE } from './dev-sim.mjs';

function fixture({ missing = false, shutdown = false, shadowed = false, preview = true, metro = true } = {}) {
  const calls = [];
  const io = {
    log() {},
    async pause() {},
    async run(command, args) {
      calls.push([command, ...args]);
      if (args.includes('devices')) return JSON.stringify({ devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-27-0': missing ? [] : [
        { udid: DEVICE, isAvailable: true, state: shutdown ? 'Shutdown' : 'Booted' },
      ] } });
      if (args.includes('print-disabled')) return '"com.apple.PosterBoard" => disabled';
      if (args.includes('notifyutil')) return `com.apple.coredevice.dtuhidd.active ${shadowed ? 1 : 0}`;
      if (args.includes('repair-input')) shadowed = false;
      if (args.includes('launchctl') && args.includes('list')) return '123\t0\tcom.apple.SpringBoard';
      if (command === 'lsof') return args.includes('-t') ? '100\n' : `p100\nn${process.cwd()}/apps/mobile\n`;
      if (command === 'ps') return `node /project/node_modules/serve-sim/dist/serve-sim.js ${DEVICE}`;
      if (command === 'kill') preview = false;
      return '';
    },
    async readPreview() { return preview ? { pid: 100, device: DEVICE, port: 3200 } : null; },
    async fetchText(url) {
      if (url.endsWith('/status')) return metro ? 'packager-status:running' : null;
      return preview ? '<title>Simulator Preview</title>' : null;
    },
    start(command, args) {
      calls.push([command, ...args]);
      if (args.includes('dev:mobile')) metro = true;
      else preview = true;
    },
  };
  return { io, calls };
}

test('missing required device stops before any mutation', async () => {
  const { io, calls } = fixture({ missing: true });
  await assert.rejects(launchSimulator(io), /指定模拟器不存在/);
  assert.equal(calls.length, 1);
});

test('healthy existing services are reused without boot or input repair', async () => {
  const { io, calls } = fixture();
  await launchSimulator(io);
  assert.ok(calls.some(call => call.includes('openurl') && call.includes(DEVICE)));
  assert.ok(!calls.some(call => call.includes('repair-input') || call.includes('boot') || call.includes('dev:mobile') || call[0] === 'kill'));
});

test('cold start boots only the required device and starts IPv4-capable Metro and preview', async () => {
  const { io, calls } = fixture({ shutdown: true, preview: false, metro: false });
  await launchSimulator(io);
  assert.ok(calls.some(call => call.join(' ') === `xcrun simctl boot ${DEVICE}`));
  assert.ok(calls.some(call => call.join(' ') === 'pnpm dev:mobile --host lan --port 8081'));
  assert.ok(calls.some(call => call.join(' ') === `pnpm exec serve-sim ${DEVICE} --port 3200 --host 127.0.0.1`));
});

test('shadowed input is repaired, waits for SpringBoard, then restarts preview before opening Kaku', async () => {
  const { io, calls } = fixture({ shadowed: true });
  let springBoardChecks = 0;
  const run = io.run;
  io.run = async (command, args) => {
    const result = await run(command, args);
    if (args.includes('launchctl') && args.includes('list') && ++springBoardChecks === 1) return '-\t0\tcom.apple.SpringBoard';
    return result;
  };
  await launchSimulator(io);
  const index = value => calls.findIndex(call => call.includes(value));
  const ready = calls.findIndex(call => call.includes('launchctl') && call.includes('list'));
  const preview = calls.findIndex(call => call.includes('--port') && call.includes('3200'));
  assert.ok(index('repair-input') < ready);
  assert.ok(ready < index('kill'));
  assert.ok(index('kill') < preview);
  assert.ok(preview < index('openurl'));
  assert.equal(springBoardChecks, 4, 'ignore the stopped process, then require three stable running observations');
});

test('an unrelated Metro port owner is rejected instead of reused', async () => {
  const { io, calls } = fixture();
  const run = io.run;
  io.run = (command, args) => command === 'lsof' && args.includes('cwd') ? 'p100\nn/another/project\n' : run(command, args);
  await assert.rejects(launchSimulator(io), /8081/);
  assert.ok(!calls.some(call => call.includes('openurl')));
});

test('a reused PID cannot cause an unrelated process to be killed', async () => {
  const { io, calls } = fixture({ shadowed: true });
  const run = io.run;
  io.run = (command, args) => command === 'ps' ? 'node unrelated-server.js' : run(command, args);
  await assert.rejects(launchSimulator(io), /3200/);
  assert.ok(!calls.some(call => call[0] === 'kill'));
});

test('Metro startup failure times out explicitly without opening Kaku', async () => {
  const { io, calls } = fixture({ metro: false });
  const fetchText = io.fetchText;
  io.fetchText = url => url.endsWith('/status') ? null : fetchText(url);
  await assert.rejects(launchSimulator(io), /Metro 启动超时/);
  assert.ok(!calls.some(call => call.includes('openurl')));
});

test('unknown input state fails instead of silently treating input as healthy', async () => {
  const { io, calls } = fixture();
  const run = io.run;
  io.run = (command, args) => args.includes('notifyutil') ? 'unexpected' : run(command, args);
  await assert.rejects(launchSimulator(io), /无法识别模拟器输入状态/);
  assert.ok(!calls.some(call => call.includes('openurl')));
});
