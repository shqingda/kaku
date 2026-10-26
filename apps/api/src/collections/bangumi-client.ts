import { z } from 'zod';
import type { PersonalCollectionUpdate } from '@kaku/shared/collections-contract';
import { CollectionWriteError } from './write-lock.ts';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';

import {
  bangumiTypeToCollectionStatus,
  collectionStatusToBangumiType,
  type CollectionStatus,
  type PersonalCollection,
} from './model.ts';

const BANGUMI_API_URL = 'https://api.bgm.tv';
const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';
const PAGE_SIZE = 1000;

// This handler returns empty 202 only after its synchronous update completes:
// https://github.com/bangumi/server/blob/5fc276a1f22368a80655c2b72427f24d177dee83/web/handler/user/post_subject_collection.go#L44-L57
// Translate that adapter contract; generic 202 and episode writes stay unknown.
export async function normalizeBangumiCollectionWriteResponse(
  input: Parameters<typeof fetch>[0], init: RequestInit | undefined, response: Response,
): Promise<Response> {
  if (response.status !== 202 || response.redirected || init?.method !== 'POST') return response;
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== BANGUMI_API_URL || url.username || url.password || url.search || url.hash ||
    !/^\/v0\/users\/-\/collections\/[1-9]\d*$/.test(url.pathname)) return response;
  if (await response.clone().text() !== '') return response;
  return new Response(null, { status: 204, headers: response.headers });
}

const userCollectionSchema = z.object({
  comment: z.string().nullish().transform((comment) => comment ?? ''),
  ep_status: z
    .number()
    .int()
    .nonnegative()
    .nullish()
    .transform((count) => count ?? 0),
  private: z
    .boolean()
    .nullish()
    .transform((isPrivate) => isPrivate ?? false),
  rate: z.number().int().min(0).max(10),
  subject_id: z.number().int().positive(),
  subject_type: z.number().int().positive(),
  tags: z
    .array(z.string())
    .nullish()
    .transform((tags) => [...new Set(tags ?? [])]),
  type: z.number().int().min(1).max(5),
  vol_status: z
    .number()
    .int()
    .nonnegative()
    .nullish()
    .transform((count) => count ?? 0),
});

const episodeCollectionPageSchema = z.object({
  data: z.array(
    z.object({
      episode: z.object({
        ep: z.number(),
        id: z.number().int().positive(),
        type: z.number().int(),
      }),
      type: z.number().int().min(0).max(3),
    }),
  ),
  total: z.number().int().nonnegative(),
});

export class BangumiApiError extends Error {
  readonly upstreamBody?: string;
  readonly upstreamRequestId?: string;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    upstreamBody?: string,
    upstreamRequestId?: string,
  ) {
    super(message);
    this.name = 'BangumiApiError';
    this.status = status;
    this.upstreamBody = upstreamBody;
    this.upstreamRequestId = upstreamRequestId;
  }
}

type BangumiEntityKind = 'character' | 'person';

function headers(accessToken: string, hasBody = false) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    'User-Agent': BANGUMI_USER_AGENT,
  };
}

async function readJson(response: Response) {
  if (!response.ok) {
    throw new BangumiApiError(
      `Bangumi API 请求失败（${response.status}）`,
      response.status,
    );
  }

  return response.json();
}

function entityPath(kind: BangumiEntityKind) {
  return kind === 'character' ? 'characters' : 'persons';
}

export async function getBangumiEntityCollection({
  accessToken,
  entityId,
  fetcher,
  kind,
  username,
}: {
  accessToken: string;
  entityId: number;
  fetcher: typeof fetch;
  kind: BangumiEntityKind;
  username: string;
}) {
  const response = await fetcher(
    `${BANGUMI_API_URL}/v0/users/${encodeURIComponent(username)}/collections/-/${entityPath(kind)}/${entityId}`,
    {
      headers: headers(accessToken),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (response.status === 404) {
    return false;
  }

  await readJson(response);
  return true;
}

export async function setBangumiEntityCollection({
  accessToken,
  collected,
  entityId,
  fetcher,
  kind,
}: {
  accessToken: string;
  collected: boolean;
  entityId: number;
  fetcher: typeof fetch;
  kind: BangumiEntityKind;
}) {
  const collectionPath = kind === 'character' ? 'characters' : 'persons';
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/collections/${collectionPath}/${entityId}`,
    {
      headers: headers(accessToken),
      method: collected ? 'PUT' : 'DELETE',
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) {
    const upstreamBody = (await response.text()).slice(0, 500);
    const upstreamRequestId = response.headers.get('x-request-id') ?? undefined;
    throw new BangumiApiError(
      `Bangumi ${collected ? '收藏' : '取消收藏'}失败（${response.status}）`,
      response.status,
      upstreamBody,
      upstreamRequestId,
    );
  }
}

async function getEpisodeCollections(
  subjectId: number,
  accessToken: string,
  fetcher: typeof fetch,
) {
  const items: z.infer<typeof episodeCollectionPageSchema>['data'] = [];
  let offset = 0;
  let total = 0;

  do {
    const query = new URLSearchParams({
      episode_type: '0',
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const response = await fetcher(
      `${BANGUMI_API_URL}/v0/users/-/collections/${subjectId}/episodes?${query}`,
      {
        headers: headers(accessToken),
        signal: AbortSignal.timeout(12_000),
      },
    );
    const page = episodeCollectionPageSchema.parse(await readJson(response));
    items.push(...page.data);
    total = page.total;
    offset += page.data.length;

    if (page.data.length === 0) {
      break;
    }
  } while (offset < total);

  return items;
}

export async function getBangumiPersonalCollection({
  accessToken,
  fetcher,
  subjectId,
  username,
}: {
  accessToken: string;
  fetcher: typeof fetch;
  subjectId: number;
  username: string;
}): Promise<PersonalCollection | null> {
  const response = await fetcher(
    `${BANGUMI_API_URL}/v0/users/${encodeURIComponent(username)}/collections/${subjectId}`,
    {
      headers: headers(accessToken),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (response.status === 404) {
    return null;
  }

  const collection = userCollectionSchema.parse(await readJson(response));
  const collectionStatus = bangumiTypeToCollectionStatus[collection.type];

  if (!collectionStatus) {
    throw new Error(`Unknown Bangumi collection type: ${collection.type}`);
  }

  const episodeCollections =
    collection.subject_type === 2 || collection.subject_type === 6
      ? await getEpisodeCollections(subjectId, accessToken, fetcher)
      : [];

  return {
    collectionStatus,
    comment: collection.comment,
    isPrivate: collection.private,
    ...(collection.subject_type === 1
      ? {
          readChapterCount: collection.ep_status,
          readVolumeCount: collection.vol_status,
        }
      : {}),
    ...(collection.rate > 0 ? { rating: collection.rate } : {}),
    subjectId,
    tags: collection.tags,
    watchedEpisodeIds: episodeCollections.filter(item => item.type === 2 && item.episode.type === 0 && item.episode.ep > 0).map(item => item.episode.id).sort((a, b) => a - b),
    watchedEpisodeNumbers: episodeCollections
      .filter((item) => item.type === 2 && item.episode.type === 0)
      .map((item) => item.episode.ep)
      .filter((episodeNumber) => episodeNumber > 0)
      .sort((left, right) => left - right),
  };
}

export async function saveBangumiPersonalCollection({
  accessToken, fetcher, subjectId, ...update
}: PersonalCollectionUpdate & {
  accessToken: string;
  fetcher: typeof fetch;
  subjectId: number;
}) {
  const patches: { episode_id: number[]; type: number }[] = [];
  if (update.watchedEpisodeNumbers !== undefined && update.expectedWatchedEpisodeIds === undefined) {
    throw new CollectionWriteError('collection_baseline_required', '批量进度缺少同步基线，请更新 Kaku 并刷新收藏后再保存。', 428);
  }
  if (update.episodeChanges || update.watchedEpisodeNumbers !== undefined) {
    const episodes = (await getEpisodeCollections(subjectId, accessToken, fetcher)).filter(item => item.episode.type === 0 && item.episode.ep > 0);
    const episodesById = new Map(episodes.map(item => [item.episode.id, item]));
    const numberCounts = new Map<number, number>();
    for (const { episode } of episodes) {
      numberCounts.set(episode.ep, (numberCounts.get(episode.ep) ?? 0) + 1);
    }
    const currentIds = episodes.filter(item => item.type === 2).map(item => item.episode.id).sort((a, b) => a - b);
    if (update.watchedEpisodeNumbers !== undefined) {
      const expectedIds = [...new Set(update.expectedWatchedEpisodeIds)].sort((a, b) => a - b);
      if (JSON.stringify(expectedIds) !== JSON.stringify(currentIds)) {
        throw new CollectionWriteError('collection_conflict', '其他设备已更新章节进度，请刷新确认后重新修改。', 412);
      }
    }
    const watchedNumbers = new Set(update.watchedEpisodeNumbers);
    const changes = update.episodeChanges ?? episodes.map(item => ({ episodeId: item.episode.id, watched: watchedNumbers.has(item.episode.ep) }));
    for (const change of changes) {
      if (!episodesById.has(change.episodeId)) throw new CollectionWriteError('invalid_episode_change', '章节不属于这个条目，请刷新后重试。', 400);
    }
    if (update.watchedEpisodeNumbers?.some(number => numberCounts.get(number) !== 1)) {
      throw new CollectionWriteError('invalid_episode_change', '章节编号缺失或重复，请逐集修改进度。', 400);
    }
    for (const watched of [true, false]) {
      const ids = changes.filter(change => change.watched === watched && (episodesById.get(change.episodeId)!.type === 2) !== watched).map(change => change.episodeId);
      if (ids.length) patches.push({ episode_id: ids, type: watched ? 2 : 0 });
    }
  }
  const body = {
    ...(update.comment !== undefined ? { comment: update.comment } : {}),
    ...(update.isPrivate !== undefined ? { private: update.isPrivate } : {}),
    ...(update.readChapterCount !== undefined ? { ep_status: update.readChapterCount } : {}),
    ...(update.rating !== undefined ? { rate: update.rating } : {}),
    ...(update.tags !== undefined ? { tags: update.tags } : {}),
    ...(update.collectionStatus != null ? { type: collectionStatusToBangumiType[update.collectionStatus] } : {}),
    ...(update.readVolumeCount !== undefined ? { vol_status: update.readVolumeCount } : {}),
  };
  let completedWrites = 0;
  async function write(url: string, method: string, body: unknown) {
    const response = await fetcher(url, {
      body: JSON.stringify(body), headers: headers(accessToken, true), method,
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      if (completedWrites) throw new CollectionWriteError('collection_partial_success', '部分修改已经保存，后续修改失败。请先刷新确认结果后再操作。', 409);
      throw new BangumiApiError(`Bangumi 收藏更新失败（${response.status}）`, response.status);
    }
    completedWrites += 1;
  }
  if (Object.keys(body).length) await write(`${BANGUMI_API_URL}/v0/users/-/collections/${subjectId}`, 'POST', body);
  for (const patch of patches) await write(`${BANGUMI_API_URL}/v0/users/-/collections/${subjectId}/episodes`, 'PATCH', patch);
}

const collectionListPageSchema = z.object({
  total: z.number().int().nonnegative(),
  data: z.array(userCollectionSchema.extend({
    updated_at: z.string(),
    subject: z.object({
      id: z.number().int().positive(),
      name: z.string(),
      name_cn: z.string(),
      eps: z.number().nonnegative().nullish(),
      images: z.object({ common: z.string().optional(), medium: z.string().optional() }).nullish(),
    }),
  })),
});

// Authenticated v0 list includes this user's private collections. No username is
// accepted from the mobile client; the route supplies the authenticated identity.
export async function getBangumiPersonalCollectionPage({
  accessToken,
  collectionStatus,
  fetcher = fetch,
  offset,
  subjectType,
  username,
}: {
  accessToken: string;
  collectionStatus?: CollectionStatus;
  fetcher?: typeof fetch;
  offset: number;
  subjectType?: number;
  username: string;
}) {
  const query = new URLSearchParams({
    limit: '100',
    offset: String(offset),
  });
  if (subjectType) {
    query.set('subject_type', String(subjectType));
  }
  if (collectionStatus) {
    query.set('type', String(collectionStatusToBangumiType[collectionStatus]));
  }

  const response = await fetcher(
    `${BANGUMI_API_URL}/v0/users/${encodeURIComponent(username)}/collections?${query}`,
    {
      headers: headers(accessToken),
      signal: AbortSignal.timeout(12_000),
    },
  );
  const page = collectionListPageSchema.parse(await readJson(response));
  const nextOffset = offset + page.data.length;
  if (page.data.length === 0 && offset < page.total) {
    throw new BangumiApiError('收藏分页未返回数据，请刷新后重试', 502);
  }
  return {
    total: page.total,
    nextOffset: nextOffset < page.total ? nextOffset : undefined,
    items: page.data.map((item) => ({
      id: item.subject.id,
      title: item.subject.name_cn.trim() || item.subject.name,
      originalTitle: item.subject.name,
      coverUrl: (
        item.subject.images?.common ?? item.subject.images?.medium
      )?.replace(/^http:/, 'https:'),
      collectionStatus: bangumiTypeToCollectionStatus[item.type],
      subjectType: item.subject_type,
      progress: item.ep_status,
      volumeProgress: item.vol_status,
      totalEpisodes: item.subject.eps ?? 0,
      rate: item.rate || undefined,
      updatedAt: item.updated_at,
    })),
  };
}
