import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invocation } from './test-e2e.mjs';

test('E2E outputs and Java state stay in the project without replacing HOME', () => {
  const run = invocation('ios', undefined, { HOME: '/original', JAVA_TOOL_OPTIONS: '-Xmx1g' }, '/project with spaces');
  assert.equal(run.env.HOME, '/original');
  for (const key of ['XDG_STATE_HOME', 'XDG_CACHE_HOME', 'XDG_CONFIG_HOME', 'TMPDIR']) assert.ok(run.env[key].startsWith('/project with spaces/.cache/maestro/'));
  assert.match(run.env.JAVA_TOOL_OPTIONS, /-Duser.home="\/project with spaces\/.cache\/maestro\/java-home"/);
  for (const flag of ['--output', '--debug-output', '--test-output-dir']) assert.ok(run.args[run.args.indexOf(flag) + 1].startsWith(run.output));
  assert.equal(run.args[1], 'A395E274-D899-42DA-BE4C-416A9F89F671');
  assert.equal(run.env.MAESTRO_CLI_NO_ANALYTICS, '1');
});

test('only selected flows run and Android requires one explicit device', () => {
  for (const args of [['all'], ['android'], ['android', 'a,b'], ['ios', 'other-device']]) assert.throws(() => invocation(...args));
  assert.equal(invocation('android', 'serial').args[1], 'serial');
  assert.ok(invocation('reply').args.at(-1).endsWith('reply-sheet-accessibility-ios.yaml'));
  assert.equal(invocation('check').args[0], 'check-syntax');
});
