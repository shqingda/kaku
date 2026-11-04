import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { APP_ICONS, DEFAULT_APP_ICON, alternateIconPluginEntries, appIconFiles } = require('../config/app-icons.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('exactly one icon is the native default and it is the configured default', () => {
  const defaults = APP_ICONS.filter((icon) => icon.nativeName === null);
  assert.deepEqual(defaults.map((icon) => icon.id), [DEFAULT_APP_ICON]);
});

test('every icon file referenced by the native config exists for both channels', () => {
  for (const channel of ['production', 'debug']) {
    for (const icon of APP_ICONS) {
      for (const file of Object.values(appIconFiles(icon.id, channel))) {
        assert.ok(existsSync(path.join(root, file)), `${file} is missing; run pnpm --filter @kaku/mobile icons`);
      }
    }
    assert.deepEqual(alternateIconPluginEntries(channel).map((entry) => entry.name), ['Color', 'Lower']);
  }
});

test('picker previews exist for light and dark interfaces', () => {
  for (const icon of APP_ICONS) {
    for (const scheme of ['light', 'dark']) {
      assert.ok(existsSync(path.join(root, `assets/images/app-icons/previews/${icon.id}-${scheme}.png`)));
    }
  }
});
