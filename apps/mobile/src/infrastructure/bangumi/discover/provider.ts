import type {
  CalendarDay,
  DiscoverSubjectPage,
} from '@/features/discover/model';

import {
  toDiscoverSubject,
  toDiscoverSubjectPage,
} from './adapter';
import {
  getBangumiCalendar,
  getBangumiRankedSubjects,
  searchBangumiSubjects,
} from '../api-v0/client';

export async function getDiscoverCalendar(
  signal?: AbortSignal,
): Promise<CalendarDay[]> {
  const days = await getBangumiCalendar(signal);

  return days.map((day) => ({
    id: day.weekday.id,
    label: day.weekday.cn.replace('星期', '周'),
    subjects: day.items.map(toDiscoverSubject),
  }));
}

export async function getRankedSubjects(
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
): Promise<DiscoverSubjectPage> {
  const result = await getBangumiRankedSubjects(
    subjectType,
    offset,
    signal,
  );
  return toDiscoverSubjectPage(result, subjectType);
}

export async function searchDiscoverSubjects(
  keyword: string,
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
): Promise<DiscoverSubjectPage> {
  const result = await searchBangumiSubjects(
    keyword,
    subjectType,
    offset,
    signal,
  );
  return toDiscoverSubjectPage(result, subjectType);
}
