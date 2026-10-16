import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApiUrl } from '../config/api-url.cjs';

test('API target is explicit and restricted to an HTTP origin suitable for the build', () => {
  assert.equal(resolveApiUrl('https://api.example.com/'), 'https://api.example.com');
  assert.equal(resolveApiUrl('http://127.0.0.1:8787'), 'http://127.0.0.1:8787');
  assert.equal(resolveApiUrl('http://localhost:8787'), 'http://localhost:8787');
  for (const value of [undefined, '', 'not a url', 'http://api.example.com', 'https://name:password@api.example.com', 'https://api.example.com/path', 'https://api.example.com?target=local']) {
    assert.throws(() => resolveApiUrl(value));
  }
  assert.throws(() => resolveApiUrl('http://127.0.0.1:8787', true));
});

test('production build profiles explicitly retain the hosted API target', async () => {
  const { readFile } = await import('node:fs/promises');
  const profiles = JSON.parse(await readFile(new URL('../eas.json', import.meta.url), 'utf8')).build;
  for (const name of ['development', 'production', 'github']) {
    assert.equal(profiles[name].env.EXPO_PUBLIC_KAKU_API_URL, 'https://kaku-api.shqingda.workers.dev');
  }
});
