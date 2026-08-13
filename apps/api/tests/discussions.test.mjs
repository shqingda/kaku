import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBangumiEpisodeComment,
  createBangumiGroupTopic,
  createBangumiGroupTopicReply,
  createBangumiReviewReply,
  createBangumiSubjectTopic,
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

test('creating a subject topic posts title and content to the subject P1 endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/subjects/22447/topics');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      content: '大家觉得第三话的节奏如何？',
      title: '第三话节奏讨论',
      turnstileToken: 'turnstile-token',
    });
    return Response.json({ id: 30001 });
  };

  const topic = await createBangumiSubjectTopic({
    accessToken: 'access-token',
    content: '大家觉得第三话的节奏如何？',
    fetcher,
    subjectId: 22447,
    title: '第三话节奏讨论',
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(topic, { id: 30001 });
});

test('creating a group topic posts to the encoded group P1 endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/groups/anime/topics',
    );
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), {
      content: '新番楼',
      title: '七月新番集中讨论',
      turnstileToken: 'turnstile-token',
    });
    return Response.json({ id: 30002 });
  };

  const topic = await createBangumiGroupTopic({
    accessToken: 'access-token',
    content: '新番楼',
    fetcher,
    groupName: 'anime',
    title: '七月新番集中讨论',
    turnstileToken: 'turnstile-token',
  });

  assert.deepEqual(topic, { id: 30002 });
});

test('topic creation surfaces captcha and rate limit messages from upstream', async () => {
  const fetcher = async () =>
    Response.json({ code: 'CAPTCHA_ERROR' }, { status: 400 });

  await assert.rejects(
    () =>
      createBangumiSubjectTopic({
        accessToken: 'access-token',
        content: '内容',
        fetcher,
        subjectId: 1,
        title: '标题',
        turnstileToken: 'stale-token',
      }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.message, '安全验证已过期，请重新验证后再试。');
      return true;
    },
  );

  const rateLimitedFetcher = async () => new Response('{}', { status: 429 });

  await assert.rejects(
    () =>
      createBangumiGroupTopic({
        accessToken: 'access-token',
        content: '内容',
        fetcher: rateLimitedFetcher,
        groupName: 'anime',
        title: '标题',
        turnstileToken: 'turnstile-token',
      }),
    (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.message, '操作得太频繁了，请稍后再试。');
      return true;
    },
  );
});
