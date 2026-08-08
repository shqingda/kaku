import assert from 'node:assert/strict';
import test from 'node:test';

import { createBangumiSubjectTopicReply } from '../src/discussions/bangumi-client.ts';

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
