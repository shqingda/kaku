import {
  bangumiCharacterSchema,
  bangumiCalendarSchema,
  bangumiEntityRelationsSchema,
  bangumiCharacterSearchPageSchema,
  bangumiEntitySubjectsSchema,
  bangumiEpisodePageSchema,
  bangumiPersonSchema,
  bangumiPersonSearchPageSchema,
  bangumiPublicUserSchema,
  bangumiSubjectCharactersSchema,
  bangumiSubjectRelationsSchema,
  bangumiSubjectStaffSchema,
  bangumiSubjectSearchSchema,
  bangumiSubjectSchema,
  bangumiUserCollectionsSchema,
  bangumiUserCharacterCollectionsSchema,
  bangumiUserPersonCollectionsSchema,
  type BangumiEpisodeResponse,
} from './schemas';
import { createBangumiRequester } from '../transport/http-client';

const PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 30;

const requestJson = createBangumiRequester({
  baseUrl: 'https://api.bgm.tv',
  failedMessage: (status) => `Bangumi API 请求失败（${status}）`,
  networkMessage: '暂时无法连接 Bangumi API',
  timeoutMessage: 'Bangumi API 请求超时',
});

export async function getBangumiSubject(
  subjectId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/v0/subjects/${subjectId}`, { signal });
  return bangumiSubjectSchema.parse(json);
}

export async function getBangumiCharacter(characterId: number) {
  const [detailJson, subjectsJson, peersJson] = await Promise.all([
    requestJson(`/v0/characters/${characterId}`),
    requestJson(`/v0/characters/${characterId}/subjects`),
    requestJson(`/v0/characters/${characterId}/persons`),
  ]);

  return {
    detail: bangumiCharacterSchema.parse(detailJson),
    peers: bangumiEntityRelationsSchema.parse(peersJson),
    subjects: bangumiEntitySubjectsSchema.parse(subjectsJson),
  };
}

export async function getBangumiPerson(personId: number) {
  const [detailJson, subjectsJson, peersJson] = await Promise.all([
    requestJson(`/v0/persons/${personId}`),
    requestJson(`/v0/persons/${personId}/subjects`),
    requestJson(`/v0/persons/${personId}/characters`),
  ]);

  return {
    detail: bangumiPersonSchema.parse(detailJson),
    peers: bangumiEntityRelationsSchema.parse(peersJson),
    subjects: bangumiEntitySubjectsSchema.parse(subjectsJson),
  };
}

export async function searchBangumiEntities(
  kind: 'character' | 'person',
  keyword: string,
  offset: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
  });
  const path = kind === 'character' ? 'characters' : 'persons';
  const json = await requestJson(`/v0/search/${path}?${query}`, {
    body: JSON.stringify({ keyword }),
    method: 'POST',
    signal,
  });

  return kind === 'character'
    ? { kind, page: bangumiCharacterSearchPageSchema.parse(json) }
    : { kind, page: bangumiPersonSearchPageSchema.parse(json) };
}

export async function getBangumiPublicUser(
  username: string,
  signal?: AbortSignal,
) {
  const json = await requestJson(
    `/v0/users/${encodeURIComponent(username)}`,
    { signal },
  );
  return bangumiPublicUserSchema.parse(json);
}

export async function getBangumiUserCollections(
  username: string,
  subjectType: number,
  offset: number,
  collectionType?: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: '20',
    offset: String(offset),
    subject_type: String(subjectType),
  });
  if (collectionType) {
    query.set('type', String(collectionType));
  }
  const json = await requestJson(
    `/v0/users/${encodeURIComponent(username)}/collections?${query}`,
    { signal },
  );
  return bangumiUserCollectionsSchema.parse(json);
}

export async function getBangumiUserEntityCollections(
  username: string,
  kind: 'character' | 'person',
  signal?: AbortSignal,
) {
  const path = kind === 'character' ? 'characters' : 'persons';
  const json = await requestJson(
    `/v0/users/${encodeURIComponent(username)}/collections/-/${path}`,
    { signal },
  );

  return kind === 'character'
    ? bangumiUserCharacterCollectionsSchema.parse(json)
    : bangumiUserPersonCollectionsSchema.parse(json);
}

export async function getBangumiSubjectStaff(subjectId: number) {
  const json = await requestJson(`/v0/subjects/${subjectId}/persons`);
  return bangumiSubjectStaffSchema.parse(json);
}

export async function getBangumiSubjectCharacters(
  subjectId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/v0/subjects/${subjectId}/characters`, {
    signal,
  });
  return bangumiSubjectCharactersSchema.parse(json);
}

export async function getBangumiSubjectRelations(
  subjectId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/v0/subjects/${subjectId}/subjects`, {
    signal,
  });
  return bangumiSubjectRelationsSchema.parse(json);
}

export async function getBangumiCalendar(signal?: AbortSignal) {
  const json = await requestJson('/calendar', { signal });
  return bangumiCalendarSchema.parse(json);
}

export async function searchBangumiSubjects(
  keyword: string,
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
  });
  const json = await requestJson(`/v0/search/subjects?${query}`, {
    body: JSON.stringify({
      filter: { type: [subjectType] },
      keyword,
      sort: 'match',
    }),
    method: 'POST',
    signal,
  });
  return bangumiSubjectSearchSchema.parse(json);
}

export async function getBangumiRankedSubjects(
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
    sort: 'rank',
    type: String(subjectType),
  });
  const json = await requestJson(`/v0/subjects?${query}`, { signal });
  return bangumiSubjectSearchSchema.parse(json);
}

async function getEpisodePage(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
    subject_id: String(subjectId),
    type: '0',
  });
  const json = await requestJson(`/v0/episodes?${query}`, { signal });
  return bangumiEpisodePageSchema.parse(json);
}

export async function getBangumiEpisodes(
  subjectId: number,
  signal?: AbortSignal,
): Promise<BangumiEpisodeResponse[]> {
  const firstPage = await getEpisodePage(subjectId, 0, signal);

  if (firstPage.total <= firstPage.data.length) {
    return firstPage.data;
  }

  const remainingOffsets = Array.from(
    { length: Math.ceil(firstPage.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) =>
      getEpisodePage(subjectId, offset, signal),
    ),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((page) => page.data),
  ];
}
