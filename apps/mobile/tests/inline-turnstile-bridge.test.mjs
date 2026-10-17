import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { TURNSTILE_BRIDGE, TURNSTILE_PAGE_URL, parseTurnstileMessage, allowTurnstileNavigation } from '../src/features/auth/inline-turnstile-bridge.ts';

function page(readyState = 'loading') {
  const messages = [];
  let options;
  let renders = 0;
  let removals = 0;
  const turnstile = { render: (_container, input) => { options = input; renders++; }, remove: () => { removals++; } };
  const window = { location: { origin: 'https://next.bgm.tv', pathname: '/p1/turnstile' }, ReactNativeWebView: { postMessage: text => messages.push(JSON.parse(text)) }, turnstile,
    onload: () => turnstile.render('#turnstile-container', { sitekey: 'upstream-key', theme: 'auto', callback: () => assert.fail('must not open a deep link') }) };
  const document = { readyState, createElement: () => ({}), head: { appendChild: () => {} } };
  const context = vm.createContext({ window, document });
  return { window, context, messages, options: () => options, renders: () => renders, removals: () => removals };
}

test('official render keeps its sitekey and only exposes interaction when Cloudflare asks', () => {
  const p = page();
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  p.window.onload();
  assert.equal(p.options().sitekey, 'upstream-key');
  assert.equal(p.options().appearance, 'interaction-only');
  assert.equal(p.renders(), 1);
  assert.deepEqual(p.messages, []);
  p.options()['before-interactive-callback']();
  p.options().callback('single-use-token');
  assert.deepEqual(p.messages, [{ type: 'interactive' }, { type: 'token', token: 'single-use-token' }]);
});

test('late injection replaces an already rendered widget once and is idempotent', () => {
  const p = page('complete');
  p.window.onload();
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  assert.equal(p.renders(), 2);
  assert.equal(p.removals(), 1);
});

test('widget failures, expiry and interaction timeout are explicit', () => {
  const p = page();
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  p.window.onload();
  p.options()['error-callback']('300030');
  p.options()['expired-callback']();
  p.options()['timeout-callback']();
  assert.deepEqual(p.messages.map(m => m.type), ['error', 'expired', 'timeout']);
});

test('changed official page fails explicitly instead of leaving a blank challenge', () => {
  const p = page();
  p.window.onload = null;
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  assert.deepEqual(p.messages, [{ type: 'error' }]);
});

test('bridge rejects messages from other origins, malformed messages and oversized tokens', () => {
  const message = JSON.stringify({ type: 'token', token: 'valid-token' });
  assert.deepEqual(parseTurnstileMessage(TURNSTILE_PAGE_URL, message), { type: 'token', token: 'valid-token' });
  for (const url of ['https://evil.test/p1/turnstile', 'https://next.bgm.tv.evil.test/p1/turnstile', 'https://next.bgm.tv/p1/login']) {
    assert.equal(parseTurnstileMessage(url, message), null);
  }
  for (const data of ['not json', 'null', '{}', '{"type":"token","token":""}', JSON.stringify({ type: 'token', token: 'x'.repeat(2049) })]) {
    assert.equal(parseTurnstileMessage(TURNSTILE_PAGE_URL, data), null);
  }
});

test('navigation keeps the top frame on the official page and permits challenge subframes only', () => {
  assert.equal(allowTurnstileNavigation(TURNSTILE_PAGE_URL, true), true);
  assert.equal(allowTurnstileNavigation('https://challenges.cloudflare.com/cdn-cgi/challenge', false), true);
  assert.equal(allowTurnstileNavigation('about:blank', false), true);
  assert.equal(allowTurnstileNavigation('about:srcdoc', false), true);
  for (const url of ['https://evil.test', 'kaku://auth/turnstile?token=x', 'https://challenges.cloudflare.com']) {
    assert.equal(allowTurnstileNavigation(url, true), false);
  }
});
