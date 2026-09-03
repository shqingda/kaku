import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHARACTER_TYPES,
  PEOPLE_GENDERS,
  PEOPLE_KINDS,
  PEOPLE_SORTS,
  PERSON_TYPES,
} from '../src/features/people-browser/model.ts';

test('people kinds map characters and persons to their Chinese labels', () => {
  assert.deepEqual(PEOPLE_KINDS, [
    { id: 'character', label: '虚构角色' },
    { id: 'person', label: '现实人物' },
  ]);
});

test('people sorts order newest, collected, discussed, then title', () => {
  assert.deepEqual(PEOPLE_SORTS, [
    { id: 'dateline', label: '最新' },
    { id: 'collects', label: '收藏' },
    { id: 'comment', label: '讨论' },
    { id: 'title', label: '名称' },
  ]);
});

test('character types offer the four bangumi character categories', () => {
  assert.deepEqual(
    CHARACTER_TYPES.filter((type) => type.id !== undefined).map((t) => t),
    [
      { id: 1, label: '角色' },
      { id: 2, label: '机体' },
      { id: 3, label: '舰船' },
      { id: 4, label: '组织机构' },
    ],
  );
});

test('person types cover the bangumi person professions', () => {
  assert.deepEqual(
    PERSON_TYPES.filter((type) => type.id !== undefined).map((t) => t),
    [
      { id: 1, label: '声优' },
      { id: 2, label: '漫画家' },
      { id: 7, label: '绘师' },
      { id: 3, label: '制作人' },
      { id: 4, label: '音乐人' },
      { id: 8, label: '作家' },
      { id: 6, label: '演员' },
    ],
  );
});

test('genders only distinguish male, female and unrestricted', () => {
  assert.deepEqual(PEOPLE_GENDERS, [
    { id: undefined, label: '不限性别' },
    { id: 1, label: '男性' },
    { id: 2, label: '女性' },
  ]);
});

test('every filter catalog leads with an unset all option for resetting', () => {
  for (const catalog of [CHARACTER_TYPES, PERSON_TYPES, PEOPLE_GENDERS]) {
    assert.equal(catalog[0].id, undefined);
    assert.equal(catalog[0].label.length > 0, true);
  }
});

test('every filter option id is unique within its catalog', () => {
  for (const catalog of [PEOPLE_KINDS, PEOPLE_SORTS, CHARACTER_TYPES, PERSON_TYPES, PEOPLE_GENDERS]) {
    const ids = catalog.map((option) => option.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});
