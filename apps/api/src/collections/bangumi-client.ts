import { z } from 'zod';

import {
  bangumiTypeToCollectionStatus,
  collectionStatusToBangumiType,
  type CollectionStatus,
  type PersonalCollection,
} from './model.ts';

const BANGUMI_API_URL = 'https://api.bgm.tv';
const USER_AGENT = 'Kaku/0.1 (Bangumi third-party client; development)';
const PAGE_SIZE = 1000;

const userCollectionSchema = z.object({
  comment: z.string().nullish().transform((comment) => comment ?? ''),
  rate: z.number().int().min(0).max(10),
  subject_id: z.number().int().positive(),
  subject_type: z.number().int().positive(),
  type: z.number().int().min(1).max(5),
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
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BangumiApiError';
    this.status = status;
  }
}

function headers(accessToken: string, hasBody = false) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    'User-Agent': USER_AGENT,
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
    ...(collection.rate > 0 ? { rating: collection.rate } : {}),
    subjectId,
    watchedEpisodeNumbers: episodeCollections
      .filter((item) => item.type === 2 && item.episode.type === 0)
      .map((item) => Math.trunc(item.episode.ep))
      .filter((episodeNumber) => episodeNumber > 0)
      .sort((left, right) => left - right),
  };
}

async function updateEpisodeCollections({
  accessToken,
  fetcher,
  subjectId,
  watchedEpisodeNumbers,
}: {
  accessToken: string;
  fetcher: typeof fetch;
  subjectId: number;
  watchedEpisodeNumbers: number[];
}) {
  const episodeCollections = await getEpisodeCollections(
    subjectId,
    accessToken,
    fetcher,
  );
  const watchedNumbers = new Set(watchedEpisodeNumbers);
  const markWatched: number[] = [];
  const markUnwatched: number[] = [];

  for (const item of episodeCollections) {
    if (item.episode.type !== 0) {
      continue;
    }

    const shouldBeWatched = watchedNumbers.has(Math.trunc(item.episode.ep));

    if (shouldBeWatched && item.type !== 2) {
      markWatched.push(item.episode.id);
    } else if (!shouldBeWatched && item.type === 2) {
      markUnwatched.push(item.episode.id);
    }
  }

  for (const [episodeIds, type] of [
    [markWatched, 2],
    [markUnwatched, 0],
  ] as const) {
    if (episodeIds.length === 0) {
      continue;
    }

    const response = await fetcher(
      `${BANGUMI_API_URL}/v0/users/-/collections/${subjectId}/episodes`,
      {
        body: JSON.stringify({ episode_id: episodeIds, type }),
        headers: headers(accessToken, true),
        method: 'PATCH',
        signal: AbortSignal.timeout(12_000),
      },
    );

    if (!response.ok) {
      throw new BangumiApiError(
        `Bangumi 章节进度更新失败（${response.status}）`,
        response.status,
      );
    }
  }
}

export async function saveBangumiPersonalCollection({
  accessToken,
  collectionStatus,
  comment,
  fetcher,
  rating,
  subjectId,
  watchedEpisodeNumbers,
}: {
  accessToken: string;
  collectionStatus: CollectionStatus;
  comment?: string;
  fetcher: typeof fetch;
  rating?: number;
  subjectId: number;
  watchedEpisodeNumbers?: number[];
}) {
  const response = await fetcher(
    `${BANGUMI_API_URL}/v0/users/-/collections/${subjectId}`,
    {
      body: JSON.stringify({
        ...(comment !== undefined ? { comment } : {}),
        rate: rating ?? 0,
        type: collectionStatusToBangumiType[collectionStatus],
      }),
      headers: headers(accessToken, true),
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) {
    throw new BangumiApiError(
      `Bangumi 收藏更新失败（${response.status}）`,
      response.status,
    );
  }

  if (watchedEpisodeNumbers) {
    await updateEpisodeCollections({
      accessToken,
      fetcher,
      subjectId,
      watchedEpisodeNumbers,
    });
  }
}
