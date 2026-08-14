import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bangumiSubjectCharacterNamesSchema,
  bangumiSubjectCommentsSchema,
  bangumiSubjectReviewsSchema,
  bangumiUserBlogsSchema,
  bangumiUserFriendsSchema,
  bangumiGroupDetailSchema,
  bangumiBlogSchema,
  bangumiIndexPageSchema,
  bangumiIndexRelatedSchema,
  bangumiIndexSchema,
} from '../src/infrastructure/bangumi/api-next/schemas.ts';
import {
  bangumiCalendarSchema,
  bangumiCharacterSchema,
  bangumiEntityRelationsSchema,
  bangumiEntitySubjectsSchema,
  bangumiEpisodePageSchema,
  bangumiPersonSearchPageSchema,
  bangumiSubjectCharactersSchema,
  bangumiSubjectRelationsSchema,
  bangumiSubjectSearchSchema,
  bangumiSubjectStaffSchema,
  bangumiUserCollectionsSchema,
} from '../src/infrastructure/bangumi/api-v0/schemas.ts';

function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  assert.ok(result.success, JSON.stringify(result.error?.issues));
  return result.data;
}

function rejects(schema, value) {
  assert.equal(schema.safeParse(value).success, false);
}

const user = { id: 1, nickname: '魂', username: 'soul' };
const publicSubject = { id: 1, images: null, name: 'Name', name_cn: '名字' };

test('bangumiCalendarSchema parses weekly rows', () => {
  parseOrThrow(bangumiCalendarSchema, [
    {
      items: [{ ...publicSubject, air_date: '2026-01-01' }],
      weekday: { cn: '周一', id: 1 },
    },
  ]);
  rejects(bangumiCalendarSchema, [
    { items: [{ id: 1, images: null, name_cn: 'x' }], weekday: { cn: '一', id: 1 } },
  ]);
});

test('bangumiSubjectSearchSchema parses a search page', () => {
  const data = parseOrThrow(bangumiSubjectSearchSchema, {
    data: [publicSubject],
    limit: 10,
    offset: 0,
    total: 1,
  });
  assert.equal(data.data[0].name, 'Name');
  rejects(bangumiSubjectSearchSchema, { data: [publicSubject], limit: 10, offset: 0 });
});

test('bangumiEpisodePageSchema parses episodes', () => {
  parseOrThrow(bangumiEpisodePageSchema, {
    data: [{ comment: 0, desc: '', ep: 1, id: 1, name: '第一话', name_cn: '' }],
    limit: 10,
    offset: 0,
    total: 1,
  });
  rejects(bangumiEpisodePageSchema, {
    data: [{ ep: 1, id: 1, name: 'x', name_cn: '' }],
    limit: 10,
    offset: 0,
    total: 1,
  });
});

test('bangumiSubjectStaffSchema parses staff rows', () => {
  const data = parseOrThrow(bangumiSubjectStaffSchema, [
    { id: 1, name: 'staff', relation: '监督', type: 1 },
  ]);
  assert.equal(data[0].relation, '监督');
});

test('bangumiSubjectCharactersSchema parses characters with actors', () => {
  parseOrThrow(bangumiSubjectCharactersSchema, [
    {
      actors: [{ id: 2, name: '声优' }],
      id: 1,
      name: '角色',
      relation: '主角',
      summary: '',
    },
  ]);
  rejects(bangumiSubjectCharactersSchema, [{ id: 1, name: '角色', relation: 'x', summary: '' }]);
});

test('bangumiSubjectRelationsSchema parses related subjects', () => {
  parseOrThrow(bangumiSubjectRelationsSchema, [
    { id: 1, name: 'Name', name_cn: '名字', relation: '续集', type: 2 },
  ]);
});

test('bangumiEntityDetailSchema parses a character/person', () => {
  const data = parseOrThrow(bangumiCharacterSchema, {
    id: 1,
    name: '角色',
    summary: '',
    type: 1,
  });
  assert.equal(data.name, '角色');
  rejects(bangumiCharacterSchema, { id: 1, summary: '', type: 1 });
});

test('bangumiPersonSearchPageSchema parses person search results', () => {
  parseOrThrow(bangumiPersonSearchPageSchema, {
    data: [{ career: [], id: 1, name: '人', type: 1 }],
    limit: 10,
    offset: 0,
    total: 1,
  });
});

test('bangumiEntitySubjectsSchema parses entity subjects', () => {
  parseOrThrow(bangumiEntitySubjectsSchema, [
    { id: 1, name: 'Name', name_cn: '', staff: '', type: 2 },
  ]);
});

test('bangumiEntityRelationsSchema parses entity relations', () => {
  parseOrThrow(bangumiEntityRelationsSchema, [
    { id: 1, name: 'Name', staff: '', subject_id: 2, subject_name: 's', subject_name_cn: 's', subject_type: 2, type: 1 },
  ]);
});

test('bangumiUserCollectionsSchema parses a collection page', () => {
  parseOrThrow(bangumiUserCollectionsSchema, {
    data: [
      {
        ep_status: 1,
        rate: 8,
        subject: { eps: 12, id: 1, images: null, name: 'Name', name_cn: '', rank: 1, score: 8.5 },
        type: 2,
        updated_at: '2026-01-01',
        vol_status: 0,
      },
    ],
    limit: 10,
    offset: 0,
    total: 1,
  });
});

test('bangumiSubjectReviewsSchema parses reviews', () => {
  parseOrThrow(bangumiSubjectReviewsSchema, {
    data: [
      {
        entry: { createdAt: 1, id: 1, replies: 0, summary: '摘要', title: '标题' },
        id: 1,
        user,
      },
    ],
    total: 1,
  });
});

test('bangumiUserBlogsSchema parses blogs', () => {
  parseOrThrow(bangumiUserBlogsSchema, {
    data: [{ createdAt: 1, id: 1, public: true, replies: 0, summary: '', title: 't', updatedAt: 2 }],
    total: 1,
  });
});

test('bangumiUserFriendsSchema parses friends', () => {
  const data = parseOrThrow(bangumiUserFriendsSchema, { data: [user], total: 1 });
  assert.equal(data.data[0].username, 'soul');
});

test('bangumiGroupDetailSchema parses a group detail', () => {
  parseOrThrow(bangumiGroupDetailSchema, {
    accessible: true,
    createdAt: 1,
    icon: { large: '', medium: '', small: '' },
    id: 1,
    members: 1,
    name: 'g',
    nsfw: false,
    title: 'G',
    description: '',
    posts: 0,
    topics: 0,
  });
});

test('bangumiBlogSchema parses a blog', () => {
  parseOrThrow(bangumiBlogSchema, {
    content: '',
    createdAt: 1,
    id: 1,
    replies: 0,
    title: 't',
    updatedAt: 2,
    user,
  });
  rejects(bangumiBlogSchema, { content: '', createdAt: 1, id: 1, replies: 0, title: 't', updatedAt: 2 });
});

test('bangumiIndexPageSchema parses an index page', () => {
  parseOrThrow(bangumiIndexPageSchema, {
    data: [{ id: 1, title: 't', total: 1, updatedAt: 1 }],
    total: 1,
  });
});

test('bangumiIndexRelatedSchema parses related index items', () => {
  parseOrThrow(bangumiIndexRelatedSchema, { data: [{ cat: 1, comment: '' }], total: 1 });
  rejects(bangumiIndexRelatedSchema, { data: [{ comment: '' }], total: 1 });
});

test('bangumiIndexSchema parses a full index', () => {
  parseOrThrow(bangumiIndexSchema, {
    id: 1,
    title: 't',
    total: 1,
    updatedAt: 1,
    collects: 0,
    desc: '',
    replies: 0,
  });
});

test('bangumiSubjectCommentsSchema parses subject comments', () => {
  parseOrThrow(bangumiSubjectCommentsSchema, {
    data: [{ comment: 'c', id: 1, rate: 8, updatedAt: 1, user }],
    total: 1,
  });
});

test('bangumiSubjectCharacterNamesSchema parses character names', () => {
  parseOrThrow(bangumiSubjectCharacterNamesSchema, {
    data: [{ character: { id: 1, nameCN: '名字' } }],
    total: 1,
  });
});
