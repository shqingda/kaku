import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { TURNSTILE_BRIDGE, allowTurnstileNavigation, turnstileTokenFromRedirect } from '../src/features/auth/inline-turnstile-bridge.ts';

function page(pathname = '/p1/turnstile') {
  const appended = [];
  const root = { appendChild: node => appended.push(node) };
  const window = { location: { origin: 'https://next.bgm.tv', pathname } };
  const document = {
    head: null,
    documentElement: root,
    createElement: () => ({}),
    getElementById: id => appended.find(node => node.id === id) ?? null,
  };
  return { appended, document, window, context: vm.createContext({ window, document }) };
}

test('the bridge only restyles the official page, once, before head exists', () => {
  const p = page();
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  assert.equal(p.appended.length, 2);
  assert.match(p.appended[1].textContent, /#turnstile-container/);
  assert.match(p.appended[1].textContent, /overflow:hidden!important/);
  const other = page('/other');
  vm.runInContext(TURNSTILE_BRIDGE, other.context);
  assert.equal(other.appended.length, 0);
});

test('the bridge restyles again if the document discarded its first injection', () => {
  const p = page();
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  p.appended.length = 0;
  vm.runInContext(TURNSTILE_BRIDGE, p.context);
  assert.equal(p.appended.length, 2);
});

test('navigation keeps the top frame on the official page and permits challenge subframes only', () => {
  assert.equal(allowTurnstileNavigation('https://next.bgm.tv/p1/turnstile?x=1', true), true);
  assert.equal(allowTurnstileNavigation('https://evil.example/', true), false);
  assert.equal(allowTurnstileNavigation('https://challenges.cloudflare.com/x', true), false);
  assert.equal(allowTurnstileNavigation('https://challenges.cloudflare.com/x', false), true);
  assert.equal(allowTurnstileNavigation('about:blank', false), true);
  assert.equal(allowTurnstileNavigation('https://evil.example/', false), false);
});

test('only the official callback redirect yields a token', () => {
  assert.equal(turnstileTokenFromRedirect('kaku://auth/turnstile?token=abc.def'), 'abc.def');
  assert.equal(turnstileTokenFromRedirect('kaku://auth/turnstile'), null);
  assert.equal(turnstileTokenFromRedirect('kaku://auth/other?token=abc'), null);
  assert.equal(turnstileTokenFromRedirect('https://next.bgm.tv/p1/turnstile?token=abc'), null);
  assert.equal(turnstileTokenFromRedirect(`kaku://auth/turnstile?token=${'x'.repeat(2049)}`), null);
});
