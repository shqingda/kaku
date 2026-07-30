import {
  bangumiCharacterSchema,
  bangumiCalendarSchema,
  bangumiEntitySubjectsSchema,
  bangumiEpisodePageSchema,
  bangumiPersonSchema,
  bangumiPublicUserSchema,
  bangumiSubjectCharactersSchema,
  bangumiSubjectRelationsSchema,
  bangumiSubjectStaffSchema,
  bangumiSubjectSearchSchema,
  bangumiSubjectSchema,
  bangumiUserCollectionsSchema,
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

export async function getBangumiSubject(subjectId: number) {
  const json = await requestJson(`/v0/subjects/${subjectId}`);
  return bangumiSubjectSchema.parse(json);
}

export async function getBangumiCharacter(characterId: number) {
  const [detailJson, subjectsJson] = await Promise.all([
    requestJson(`/v0/characters/${characterId}`),
    requestJson(`/v0/characters/${characterId}/subjects`),
  ]);

  return {
    detail: bangumiCharacterSchema.parse(detailJson),
    subjects: bangumiEntitySubjectsSchema.parse(subjectsJson),
  };
}

export async function getBangumiPerson(personId: number) {
  const [detailJson, subjectsJson] = await Promise.all([
    requestJson(`/v0/persons/${personId}`),
    requestJson(`/v0/persons/${personId}/subjects`),
  ]);

  return {
    detail: bangumiPersonSchema.parse(detailJson),
    subjects: bangumiEntitySubjectsSchema.parse(subjectsJson),
  };
}

export async function getBangumiPublicUser(username: string) {
  const json = await requestJson(
    `/v0/users/${encodeURIComponent(username)}`,
  );
  return bangumiPublicUserSchema.parse(json);
}

export async function getBangumiUserCollections(
  username: string,
  subjectType: number,
  offset: number,
) {
  const query = new URLSearchParams({
    limit: '20',
    offset: String(offset),
    subject_type: String(subjectType),
  });
  const json = await requestJson(
    `/v0/users/${encodeURIComponent(username)}/collections?${query}`,
  );
  return bangumiUserCollectionsSchema.parse(json);
}

export async function getBangumiSubjectStaff(subjectId: number) {
  const json = await requestJson(`/v0/subjects/${subjectId}/persons`);
  return bangumiSubjectStaffSchema.parse(json);
}

export async function getBangumiSubjectCharacters(subjectId: number) {
  const json = await requestJson(`/v0/subjects/${subjectId}/characters`);
  return bangumiSubjectCharactersSchema.parse(json);
}

export async function getBangumiSubjectRelations(subjectId: number) {
  const json = await requestJson(`/v0/subjects/${subjectId}/subjects`);
  return bangumiSubjectRelationsSchema.parse(json);
}

export async function getBangumiCalendar() {
  const json = await requestJson('/calendar');
  return bangumiCalendarSchema.parse(json);
}

export async function searchBangumiSubjects(
  keyword: string,
  subjectType: number,
  offset: number,
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
  });
  return bangumiSubjectSearchSchema.parse(json);
}

export async function getBangumiRankedSubjects(
  subjectType: number,
  offset: number,
) {
  const query = new URLSearchParams({
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
    sort: 'rank',
    type: String(subjectType),
  });
  const json = await requestJson(`/v0/subjects?${query}`);
  return bangumiSubjectSearchSchema.parse(json);
}

async function getEpisodePage(subjectId: number, offset: number) {
  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
    subject_id: String(subjectId),
    type: '0',
  });
  const json = await requestJson(`/v0/episodes?${query}`);
  return bangumiEpisodePageSchema.parse(json);
}

export async function getBangumiEpisodes(
  subjectId: number,
): Promise<BangumiEpisodeResponse[]> {
  const firstPage = await getEpisodePage(subjectId, 0);

  if (firstPage.total <= firstPage.data.length) {
    return firstPage.data;
  }

  const remainingOffsets = Array.from(
    { length: Math.ceil(firstPage.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => getEpisodePage(subjectId, offset)),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((page) => page.data),
  ];
}
