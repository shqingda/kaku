import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBangumiEpisodeComment,
  createBangumiGroupTopicReply,
  createBangumiReviewReply,
  createBangumiSubjectTopicReply,
  getBangumiEpisodeComments,
  getBangumiGroupTopic,
  getBangumiReview,
  getBangumiSubjectTopic,
} from '../src/discussions/bangumi-client.ts';

test('reading a restricted subject topic forwards OAuth through Kaku', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/subjects/-/topics/22447',
    );
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.equal(init.headers.Accept, 'application/json');

    return Response.json({
      createdAt: 1_785_940_000,
      creator: {
        id: 1,
        nickname: '测试用户',
        username: 'tester',
      },
      creatorID: 1,
      id: 22447,
      parentID: 123,
      replies: [],
      replyCount: 0,
      title: '登录后可见的话题',
      updatedAt: 1_785_940_000,
    });
  };

  const topic = await getBangumiSubjectTopic({
    accessToken: 'access-token',
    fetcher,
    topicId: 22447,
  });

  assert.equal(topic.id, 22447);
  assert.equal(topic.title, '登录后可见的话题');
});

test('authenticated discussion reads use each matching P1 endpoint', async () => {
  const requestedUrls = [];
  const reply = {
    content: '登录后可见的回复',
    createdAt: 1_785_940_000,
    creatorID: 1,
    id: 10,
  };
  const fetcher = async (input, init) => {
    const url = String(input);
    requestedUrls.push(url);
    assert.equal(init.headers.Authorization, 'Bearer access-token');

    if (url.endsWith('/groups/-/topics/123')) {
      return Response.json({
        createdAt: 1_785_940_000,
        creatorID: 1,
        group: {
          accessible: true,
          createdAt: 1,
          icon: { large: '', medium: '', small: '' },
          id: 9,
          members: 100,
          name: 'test',
          nsfw: false,
          title: '测试小组',
        },
        id: 123,
        parentID: 9,
        replies: [reply],
        replyCount: 1,
        title: '小组话题',
        updatedAt: 1_785_940_000,
      });
    }
    if (url.endsWith('/episodes/987/comments')) {
      return Response.json([reply]);
    }
    if (url.endsWith('/blogs/378109/comments')) {
      return Response.json([reply]);
    }
    if (url.endsWith('/blogs/378109')) {
      return Response.json({
        content: '评论正文',
        createdAt: 1,
        id: 378109,
        replies: 1,
        title: '长评',
        updatedAt: 2,
        user: { id: 1, nickname: '测试用户', username: 'tester' },
      });
    }

    return new Response(null, { status: 404 });
  };

  const [groupTopic, episodeComments, review] = await Promise.all([
    getBangumiGroupTopic({
      accessToken: 'access-token',
      fetcher,
      topicId: 123,
    }),
    getBangumiEpisodeComments({
      accessToken: 'access-token',
      episodeId: 987,
      fetcher,
    }),
    getBangumiReview({
      accessToken: 'access-token',
      fetcher,
      reviewId: 378109,
    }),
  ]);

  assert.equal(groupTopic.replies[0].content, '登录后可见的回复');
  assert.equal(episodeComments[0].id, 10);
  assert.equal(review.blog.title, '长评');
  assert.equal(review.comments[0].id, 10);
  assert.equal(requestedUrls.length, 4);
});

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

test('creating a review reply uses the blog comments P1 endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/blogs/378109/comments',
    );
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      content: '这篇评论把问题讲清楚了。',
      replyTo: 789,
      turnstileToken: 'turnstile-token',
    });
    return Response.json({ id: 10004 });
  };

  const reply = await createBangumiReviewReply({
    accessToken: 'access-token',
    content: '这篇评论把问题讲清楚了。',
    fetcher,
    replyTo: 789,
    reviewId: 378109,
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(reply, { id: 10004 });
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
