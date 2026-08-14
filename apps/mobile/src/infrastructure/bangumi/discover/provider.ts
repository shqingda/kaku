import type {
  CalendarDay,
  DiscoverProvider,
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

export const bangumiDiscoverProvider: DiscoverProvider = {
  async getCalendar(signal): Promise<CalendarDay[]> {
    const days = await getBangumiCalendar(signal);

    return days.map((day) => ({
      id: day.weekday.id,
      label: day.weekday.cn.replace('星期', '周'),
      subjects: day.items.map(toDiscoverSubject),
    }));
  },
  async getRankedSubjects(subjectType, offset, signal) {
    const result = await getBangumiRankedSubjects(
      subjectType,
      offset,
      signal,
    );
    return toDiscoverSubjectPage(result, subjectType);
  },
  async searchSubjects(keyword, subjectType, offset, signal) {
    const result = await searchBangumiSubjects(
      keyword,
      subjectType,
      offset,
      signal,
    );
    return toDiscoverSubjectPage(result, subjectType);
  },
};
