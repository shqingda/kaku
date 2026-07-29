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
  async getCalendar(): Promise<CalendarDay[]> {
    const days = await getBangumiCalendar();

    return days.map((day) => ({
      id: day.weekday.id,
      label: day.weekday.cn.replace('星期', '周'),
      subjects: day.items.map(toDiscoverSubject),
    }));
  },
  async getRankedSubjects(offset) {
    const result = await getBangumiRankedSubjects(offset);
    return toDiscoverSubjectPage(result);
  },
  async searchSubjects(keyword, subjectType, offset) {
    const result = await searchBangumiSubjects(keyword, subjectType, offset);
    return toDiscoverSubjectPage(result, subjectType);
  },
};
