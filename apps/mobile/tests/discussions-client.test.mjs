import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCharacterComment,
  createEpisodeComment,
  createGroupTopic,
  createGroupTopicReply,
  createPersonComment,
  createReviewReply,
  createSubjectTopic,
  createSubjectTopicReply,
  deleteBlogComment,
  deleteCharacterComment,
  deleteEpisodeComment,
  deleteGroupPost,
  deletePersonComment,
  deleteSubjectPost,
  editBlogComment,
  editCharacterComment,
  editEpisodeComment,
  editGroupPost,
  editPersonComment,
  editSubjectPost,
  getAuthenticatedEpisodeComments,
  getAuthenticatedGroupTopic,
  getAuthenticatedReview,
  getAuthenticatedSubjectTopic,
} from '../src/infrastructure/kaku/discussions-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const user = { id: 5, nickname: '魂', username: 'soul' };

const reply = {
  content: '第一话太强了',
  createdAt: 1_785_940_000,
  creatorID: 5,
  id: 900,
};

const group = {
  accessible: true,
  createdAt: 1_000_000,
  icon: {
    large: 'https://lain.bgm.tv/pic/icon/l/1.jpg',
    medium: 'https://lain.bgm.tv/pic/icon/m/1.jpg',
    small: 'https://lain.bgm.tv/pic/icon/s/1.jpg',
  },
  id: 33,
  members: 4321,
  name: 'frieren',
  nsfw: false,
  title: '葬送的芙莉莲',
};

const subjectTopic = {
  createdAt: 1_785_940_000,
  creator: user,
  creatorID: 5,
  id: 11,
  parentID: 425,
  replyCount: 1,
  replies: [reply],
  title: '第一话讨论',
  updatedAt: 1_785_950_000,
};

const groupTopic = {
  createdAt: 1_785_940_000,
  creatorID: 5,
  group,
  id: 12,
  parentID: 33,
  replyCount: 0,
  replies: [],
  title: '动画组采访帖',
  updatedAt: 1_785_950_000,
};

const blog = {
  content: '观后感正文',
  createdAt: 1_785_940_000,
  id: 21,
  replies: 1,
  title: '蓝与火 第一话观感',
  updatedAt: 1_785_950_000,
  user,
};

const createdReply = { id: 901 };

test('getAuthenticatedSubjectTopic requests the topic and parses it', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json(subjectTopic);
  };

  const topic = await getAuthenticatedSubjectTopic(request, 11);

  assert.deepEqual(calls, [
    { path: '/me/subject-topics/11', init: { signal: undefined } },
  ]);
  assert.equal(topic.id, 11);
  assert.equal(topic.replies[0].id, 900);
});

test('getAuthenticatedSubjectTopic returns null on 404', async () => {
  const request = async () => new Response('not found', { status: 404 });

  assert.equal(await getAuthenticatedSubjectTopic(request, 11), null);
});

test('getAuthenticatedSubjectTopic forwards the abort signal', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return Response.json(subjectTopic);
  };
  const controller = new AbortController();

  await getAuthenticatedSubjectTopic(request, 11, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('getAuthenticatedGroupTopic requests the topic and parses the group', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json(groupTopic);
  };

  const topic = await getAuthenticatedGroupTopic(request, 12);

  assert.deepEqual(calls, [
    { path: '/me/group-topics/12', init: { signal: undefined } },
  ]);
  assert.equal(topic.group.name, 'frieren');
});

test('getAuthenticatedGroupTopic returns null on 404', async () => {
  const request = async () => new Response('not found', { status: 404 });

  assert.equal(await getAuthenticatedGroupTopic(request, 12), null);
});

test('getAuthenticatedEpisodeComments parses the reply list', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json([reply]);
  };

  const comments = await getAuthenticatedEpisodeComments(request, 3001);

  assert.deepEqual(calls, [
    { path: '/me/episodes/3001/comments', init: { signal: undefined } },
  ]);
  assert.deepEqual(comments, [reply]);
});

test('getAuthenticatedReview parses the blog and its comments', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ blog, comments: [reply] });
  };

  const review = await getAuthenticatedReview(request, 21);

  assert.deepEqual(calls, [
    { path: '/me/reviews/21', init: { signal: undefined } },
  ]);
  assert.equal(review.blog.title, '蓝与火 第一话观感');
  assert.equal(review.comments[0].id, 900);
});

test('discussion reads throw KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '登录已过期' }), { status: 401 });

  await assert.rejects(() => getAuthenticatedSubjectTopic(request, 11), {
    name: 'KakuApiError',
    status: 401,
    message: '登录已过期',
  });
  await assert.rejects(() => getAuthenticatedGroupTopic(request, 12), {
    name: 'KakuApiError',
    status: 401,
  });
  await assert.rejects(() => getAuthenticatedEpisodeComments(request, 3001), {
    name: 'KakuApiError',
    status: 401,
  });
  await assert.rejects(() => getAuthenticatedReview(request, 21), {
    name: 'KakuApiError',
    status: 401,
  });
});

test('createSubjectTopicReply posts the reply with replyTo when set', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json(createdReply);
  };

  const result = await createSubjectTopicReply(request, {
    content: '同感',
    replyTo: 900,
    topicId: 11,
    turnstileToken: 'ts-1',
  });

  assert.deepEqual(calls, [
    {
      path: '/me/subject-topics/11/replies',
      init: {
        body: JSON.stringify({
          content: '同感',
          replyTo: 900,
          turnstileToken: 'ts-1',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, createdReply);
});

test('createSubjectTopicReply omits replyTo when not replying to anyone', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json(createdReply);
  };

  await createSubjectTopicReply(request, {
    content: '沙发',
    topicId: 11,
    turnstileToken: 'ts-1',
  });

  assert.deepEqual(JSON.parse(calls[0].init.body), {
    content: '沙发',
    turnstileToken: 'ts-1',
  });
});

test('createGroupTopicReply posts to the group topic path', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json(createdReply);
  };

  const result = await createGroupTopicReply(request, {
    content: '打卡',
    topicId: 12,
    turnstileToken: 'ts-2',
  });

  assert.deepEqual(calls, [
    {
      path: '/me/group-topics/12/replies',
      init: {
        body: JSON.stringify({ content: '打卡', turnstileToken: 'ts-2' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, createdReply);
});

test('createEpisodeComment, createReviewReply, createCharacterComment and createPersonComment post to their paths', async () => {
  const paths = [];
  const request = async (path, init) => {
    paths.push({ init, path });
    return Response.json(createdReply);
  };
  const input = { content: '赞', turnstileToken: 'ts-3' };

  await createEpisodeComment(request, { ...input, episodeId: 3001 });
  await createReviewReply(request, { ...input, reviewId: 21 });
  await createCharacterComment(request, { ...input, characterId: 7 });
  await createPersonComment(request, { ...input, personId: 8 });

  assert.deepEqual(
    paths.map(({ path }) => path),
    [
      '/me/episodes/3001/comments',
      '/me/reviews/21/replies',
      '/me/characters/7/comments',
      '/me/persons/8/comments',
    ],
  );
  for (const { init } of paths) {
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), {
      content: '赞',
      turnstileToken: 'ts-3',
    });
  }
});

test('createSubjectTopic posts to the subject topics path', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ id: 13 });
  };

  const result = await createSubjectTopic(request, {
    content: '第一话很棒',
    subjectId: 425,
    title: '第一话讨论',
    turnstileToken: 'ts-4',
  });

  assert.deepEqual(calls, [
    {
      path: '/me/subjects/425/topics',
      init: {
        body: JSON.stringify({
          content: '第一话很棒',
          title: '第一话讨论',
          turnstileToken: 'ts-4',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, { id: 13 });
});

test('createGroupTopic encodes the group name', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ id: 14 });
  };

  const result = await createGroupTopic(request, {
    content: '大家好',
    groupName: 'frieren fan',
    title: '新人报到',
    turnstileToken: 'ts-5',
  });

  assert.deepEqual(calls, [
    {
      path: `/me/groups/${encodeURIComponent('frieren fan')}/topics`,
      init: {
        body: JSON.stringify({
          content: '大家好',
          title: '新人报到',
          turnstileToken: 'ts-5',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, { id: 14 });
});

test('replies and topics throw KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '发表过于频繁' }), { status: 429 });

  await assert.rejects(
    () =>
      createSubjectTopicReply(request, {
        content: 'x',
        topicId: 11,
        turnstileToken: 'ts',
      }),
    { name: 'KakuApiError', status: 429, message: '发表过于频繁' },
  );
  await assert.rejects(
    () =>
      createGroupTopicReply(request, {
        content: 'x',
        topicId: 12,
        turnstileToken: 'ts',
      }),
    { name: 'KakuApiError', status: 429 },
  );
  await assert.rejects(
    () => createSubjectTopic(request, { content: 'x', subjectId: 1, title: 't', turnstileToken: 'ts' }),
    { name: 'KakuApiError', status: 429 },
  );
  await assert.rejects(
    () => createGroupTopic(request, { content: 'x', groupName: 'g', title: 't', turnstileToken: 'ts' }),
    { name: 'KakuApiError', status: 429 },
  );
});

test('deleteSubjectPost and deleteGroupPost send DELETE', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 204 });
  };

  await deleteSubjectPost(request, 55);
  await deleteGroupPost(request, 66);

  assert.deepEqual(calls, [
    { path: '/me/subject-posts/55', init: { method: 'DELETE' } },
    { path: '/me/group-posts/66', init: { method: 'DELETE' } },
  ]);
});

test('deleteEpisodeComment, deleteBlogComment, deleteCharacterComment and deletePersonComment send DELETE', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 204 });
  };

  await deleteEpisodeComment(request, 1);
  await deleteBlogComment(request, 2);
  await deleteCharacterComment(request, 3);
  await deletePersonComment(request, 4);

  assert.deepEqual(
    calls.map(({ path }) => path),
    [
      '/me/episode-comments/1',
      '/me/blog-comments/2',
      '/me/character-comments/3',
      '/me/person-comments/4',
    ],
  );
  for (const { init } of calls) {
    assert.equal(init.method, 'DELETE');
  }
});

test('editSubjectPost and editGroupPost put the new content', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 200 });
  };

  await editSubjectPost(request, 55, '修改后的正文');
  await editGroupPost(request, 66, '修改后的回帖');

  assert.deepEqual(calls, [
    {
      path: '/me/subject-posts/55',
      init: {
        body: JSON.stringify({ content: '修改后的正文' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
    {
      path: '/me/group-posts/66',
      init: {
        body: JSON.stringify({ content: '修改后的回帖' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
  ]);
});

test('editEpisodeComment, editBlogComment, editCharacterComment and editPersonComment put the new content', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 200 });
  };

  await editEpisodeComment(request, 1, 'a');
  await editBlogComment(request, 2, 'b');
  await editCharacterComment(request, 3, 'c');
  await editPersonComment(request, 4, 'd');

  assert.deepEqual(
    calls.map(({ path }) => path),
    [
      '/me/episode-comments/1',
      '/me/blog-comments/2',
      '/me/character-comments/3',
      '/me/person-comments/4',
    ],
  );
  for (const { init } of calls) {
    assert.equal(init.method, 'PUT');
    assert.equal(init.headers['Content-Type'], 'application/json');
  }
});

test('edits and deletes throw KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '没有权限' }), { status: 403 });

  await assert.rejects(() => editSubjectPost(request, 55, 'x'), {
    name: 'KakuApiError',
    status: 403,
    message: '没有权限',
  });
  await assert.rejects(() => editGroupPost(request, 66, 'x'), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => editEpisodeComment(request, 1, 'x'), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => editBlogComment(request, 2, 'x'), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => editCharacterComment(request, 3, 'x'), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => editPersonComment(request, 4, 'x'), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteSubjectPost(request, 55), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteGroupPost(request, 66), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteEpisodeComment(request, 1), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteBlogComment(request, 2), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteCharacterComment(request, 3), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deletePersonComment(request, 4), {
    name: 'KakuApiError',
    status: 403,
  });
});
