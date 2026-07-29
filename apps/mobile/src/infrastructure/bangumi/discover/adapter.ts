import type {
  DiscoverSubject,
  DiscoverSubjectPage,
} from '../../../features/discover/model.ts';
import type {
  BangumiCalendarResponse,
  BangumiSubjectSearchResponse,
} from '../api-v0/schemas.ts';

type PublicSubject =
  | BangumiCalendarResponse[number]['items'][number]
  | BangumiSubjectSearchResponse['data'][number];

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

export function toDiscoverSubject(
  subject: PublicSubject,
  subjectType = 2,
): DiscoverSubject {
  return {
    coverUrl: secureImage(
      subject.images?.common ??
        subject.images?.medium ??
        subject.images?.small,
    ),
    date: 'air_date' in subject ? subject.air_date : subject.date ?? undefined,
    id: subject.id,
    score: subject.rating?.score,
    title: subject.name_cn.trim() || subject.name,
    type: subjectType,
  };
}

export function toDiscoverSubjectPage(
  result: BangumiSubjectSearchResponse,
  subjectType = 2,
): DiscoverSubjectPage {
  const nextOffset = result.offset + result.data.length;

  return {
    items: result.data.map((subject) =>
      toDiscoverSubject(subject, subjectType),
    ),
    nextOffset: nextOffset < result.total ? nextOffset : undefined,
    total: result.total,
  };
}
