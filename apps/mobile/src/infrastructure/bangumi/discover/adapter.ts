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
  };
}

export function toDiscoverSubjectPage(
  result: BangumiSubjectSearchResponse,
): DiscoverSubjectPage {
  const nextOffset = result.offset + result.data.length;

  return {
    items: result.data.map(toDiscoverSubject),
    nextOffset: nextOffset < result.total ? nextOffset : undefined,
    total: result.total,
  };
}
