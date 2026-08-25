import assert from 'node:assert/strict';
import test from 'node:test';

import {
  imageBbcode,
  imageUrlError,
  insertAtSelection,
} from '../src/features/rich-text/rich-text-input.ts';

test('rich text inserts at the current selection and replaces selected text', () => {
  assert.deepEqual(insertAtSelection('前旧后', '[img]x[/img]', { start: 1, end: 2 }, 100), {
    content: '前[img]x[/img]后',
    selection: { start: 13, end: 13 },
  });
});

test('rich text insertion respects the composer character limit', () => {
  assert.equal(insertAtSelection('123', '45', { start: 3, end: 3 }, 4), null);
});

test('image links require a complete http or https URL', () => {
  assert.equal(imageUrlError('https://example.com/a.png'), null);
  assert.equal(imageUrlError('http://img.example.com/a.jpg'), null);
  assert.match(imageUrlError('file:///tmp/a.png'), /http/);
  assert.match(imageUrlError('example.com/a.png'), /完整有效/);
});

test('image BBCode trims surrounding whitespace', () => {
  assert.equal(imageBbcode(' https://example.com/a.png '), '[img]https://example.com/a.png[/img]');
});
