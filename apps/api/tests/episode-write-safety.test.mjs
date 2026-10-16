import assert from 'node:assert/strict';
import test from 'node:test';
import { getBangumiPersonalCollection, saveBangumiPersonalCollection } from '../src/collections/bangumi-client.ts';

function upstream(episodes) {
  const writes = [];
  const episodesById = new Map(episodes.map(item => [item.episode.id, item]));
  const fetcher = async (input, init = {}) => {
    if (init.method === 'POST') { writes.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); }
    if (init.method === 'PATCH') {
      const patch = JSON.parse(init.body); writes.push(patch);
      for (const id of patch.episode_id) episodesById.get(id).type = patch.type;
      return new Response(null, { status: 204 });
    }
    if (String(input).includes('/episodes?')) {
      const query = new URL(input).searchParams;
      const offset = Number(query.get('offset'));
      const limit = Number(query.get('limit'));
      return Response.json({ data: episodes.slice(offset, offset + limit), total: episodes.length });
    }
    return Response.json({ comment: '', private: false, rate: 0, subject_id: 42, subject_type: 2, tags: [], type: 3 });
  };
  return { writes, fetcher };
}
const input = { accessToken: 'synthetic-token', subjectId: 42 };
const episode = (id, ep, type) => ({ episode: { id, ep, type: 0 }, type });

test('a single episode change preserves another device update', async () => {
  const episodes = [episode(101, 1, 2), episode(102, 2, 2), episode(103, 3, 0)];
  const { fetcher, writes } = upstream(episodes);
  await saveBangumiPersonalCollection({ ...input, fetcher, episodeChanges: [{ episodeId: 103, watched: true }] });
  assert.equal(episodes[1].type, 2);
  assert.equal(episodes[2].type, 2);
  assert.deepEqual(writes, [{ episode_id: [103], type: 2 }]);
});

test('fractional episode numbers stay distinct and ID changes touch one episode', async () => {
  const episodes = [episode(201, 1, 2), episode(202, 1.5, 0)];
  const { fetcher } = upstream(episodes);
  await saveBangumiPersonalCollection({ ...input, fetcher, episodeChanges: [{ episodeId: 202, watched: true }] });
  const collection = await getBangumiPersonalCollection({ ...input, fetcher, username: 'synthetic' });
  assert.deepEqual(collection.watchedEpisodeNumbers, [1, 1.5]);
  assert.deepEqual(collection.watchedEpisodeIds, [201, 202]);
});

test('a stale batch snapshot is rejected before any collection or episode write', async () => {
  const { fetcher, writes } = upstream([episode(101, 1, 2), episode(102, 2, 2)]);
  await assert.rejects(() => saveBangumiPersonalCollection({ ...input, fetcher, comment: 'do not write', watchedEpisodeNumbers: [1, 3], expectedWatchedEpisodeIds: [101] }), error => error.status === 412);
  assert.deepEqual(writes, []);
});

test('legacy snapshot without a baseline is rejected before writes', async () => {
  const { fetcher, writes } = upstream([episode(101, 1, 2)]);
  await assert.rejects(() => saveBangumiPersonalCollection({ ...input, fetcher, watchedEpisodeNumbers: [] }), error => error.status === 428);
  assert.deepEqual(writes, []);
});

test('explicit rejection after an earlier write reports partial success', async () => {
  const real = upstream([episode(101, 1, 0), episode(102, 2, 2)]);
  const fetcher = (input, init) => init?.method === 'PATCH' && JSON.parse(init.body).type === 0
    ? Promise.resolve(new Response(null, { status: 403 })) : real.fetcher(input, init);
  await assert.rejects(() => saveBangumiPersonalCollection({ ...input, fetcher, watchedEpisodeNumbers: [1], expectedWatchedEpisodeIds: [102] }), error => error.code === 'collection_partial_success');
});

test('five thousand ID changes span pages and leave an unmentioned episode untouched', async () => {
  const episodes = Array.from({ length: 5000 }, (_, index) => episode(index + 1, index + 1, 0));
  episodes.push(episode(6000, 6000, 2));
  const { fetcher, writes } = upstream(episodes);
  await saveBangumiPersonalCollection({ ...input, fetcher, episodeChanges: episodes.slice(0, 5000).map(item => ({ episodeId: item.episode.id, watched: true })) });
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], { episode_id: Array.from({ length: 5000 }, (_, index) => index + 1), type: 2 });
  assert.ok(episodes.every(item => item.type === 2));
});
