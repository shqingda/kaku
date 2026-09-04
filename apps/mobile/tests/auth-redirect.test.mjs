import assert from 'node:assert/strict';
import test from 'node:test';

import { rememberReturnTo, takeReturnTo } from '../src/lib/auth-redirect.ts';

test('rememberReturnTo keeps a normal path and takeReturnTo consumes it once', () => {
  rememberReturnTo('/subject/9');
  assert.equal(takeReturnTo(), '/subject/9');
  assert.equal(takeReturnTo(), undefined);
});

test('rememberReturnTo rejects the account screen so login never loops back to itself', () => {
  for (const path of [
    '/account',
    '/account?source=directory',
    '/account#sign-in',
    '/account/settings',
  ]) {
    rememberReturnTo(path);
    assert.equal(takeReturnTo(), undefined);
  }
});

test('rememberReturnTo only rejects the account route boundary', () => {
  rememberReturnTo('/accountability');
  assert.equal(takeReturnTo(), '/accountability');
});

test('rememberReturnTo drops missing paths', () => {
  rememberReturnTo(undefined);
  assert.equal(takeReturnTo(), undefined);
});

test('remembering a new path overwrites the previous one', () => {
  rememberReturnTo('/subject/1');
  rememberReturnTo('/group/frieren');
  assert.equal(takeReturnTo(), '/group/frieren');
});

test('takeReturnTo resets any stored path back to empty', () => {
  rememberReturnTo('/calendar');
  assert.equal(takeReturnTo(), '/calendar');
  rememberReturnTo(undefined);
  assert.equal(takeReturnTo(), undefined);
});
