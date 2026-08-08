import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBangumiEpisodeComment,
  createBangumiGroupTopicReply,
  createBangumiSubjectTopicReply,
} from '../src/discussions/bangumi-client.ts';

test('creating a subject topic reply keeps OAuth and Turnstile server-side', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/subjects/-/topics/22447/replies',
    );
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      content: '同意这一层的看法。',
      replyTo: 9527,
      turnstileToken: 'turnstile-token',
    });
    return Response.json({ id: 10001 });
  };

  const reply = await createBangumiSubjectTopicReply({
    accessToken: 'access-token',
    content: '同意这一层的看法。',
    fetcher,
    replyTo: 9527,
    topicId: 22447,
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(reply, { id: 10001 });
});

test('creating an episode comment uses the episode P1 endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/episodes/987/comments',
    );
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      content: '这一集的演出很好。',
      replyTo: 456,
      turnstileToken: 'turnstile-token',
    });
    return Response.json({ id: 10003 });
  };

  const reply = await createBangumiEpisodeComment({
    accessToken: 'access-token',
    content: '这一集的演出很好。',
    episodeId: 987,
    fetcher,
    replyTo: 456,
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(reply, { id: 10003 });
});

test('creating a group topic reply uses the group P1 endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/groups/-/topics/123/replies',
    );
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    return Response.json({ id: 10002 });
  };

  const reply = await createBangumiGroupTopicReply({
    accessToken: 'access-token',
    content: '小组回复',
    fetcher,
    topicId: 123,
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(reply, { id: 10002 });
});
