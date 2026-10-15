import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('direct checks bypass environment proxies and explicit checks ignore NO_PROXY', () => {
  const root = mkdtempSync(join(tmpdir(), 'kaku-upstream-'));
  const bin = join(root, 'bin');
  const log = join(root, 'curl.jsonl');
  try {
    mkdirSync(bin);
    cpSync(new URL('./check-upstream.sh', import.meta.url), join(root, 'check-upstream.sh'));
    writeFileSync(join(bin, 'curl'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.KAKU_TEST_CURL_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
process.stdout.write('200 0.001s');
`, { mode: 0o755 });
    writeFileSync(join(bin, 'dig'), `#!${process.execPath}
process.stdout.write('1.1.1.1\\n');
`, { mode: 0o755 });

    const result = spawnSync('bash', [join(root, 'check-upstream.sh')], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        KAKU_TEST_CURL_LOG: log,
        http_proxy: 'http://127.0.0.1:1001',
        https_proxy: 'http://127.0.0.1:1002',
        all_proxy: 'socks5://127.0.0.1:1003',
        HTTP_PROXY: 'http://127.0.0.1:1004',
        HTTPS_PROXY: 'http://127.0.0.1:1005',
        ALL_PROXY: 'socks5://127.0.0.1:1006',
        no_proxy: '*',
        NO_PROXY: '*',
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stderr, '');
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const urls = [
      'https://kaku-api.shqingda.workers.dev/public/rankings?type=2',
      'https://api.bgm.tv/v0/subjects/1',
      'https://www.baidu.com',
    ];
    const outputArgs = ['-o', '/dev/null', '-w', '%{http_code} %{time_total}s', '--max-time', '10'];
    assert.deepEqual(calls, [
      ...urls.map(url => ['-sS', '--noproxy', '*', ...outputArgs, url]),
      ...urls.slice(0, 2).map(url => ['-sS', '-x', 'http://127.0.0.1:7890', '--noproxy', '', ...outputArgs, url]),
    ]);
    assert.equal(result.stdout.match(/200 0\.001s/g)?.length, 5);
    assert.ok(!result.stdout.includes('失败/超时'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
