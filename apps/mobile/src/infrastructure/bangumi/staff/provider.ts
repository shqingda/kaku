import type {
  StaffCredit,
  StaffProvider,
} from '@/features/staff/model';

import { getBangumiSubjectStaff } from '../api-v0/client';
import type { BangumiSubjectStaffResponse } from '../api-v0/schemas';

function toStaffCredit(
  credit: BangumiSubjectStaffResponse[number],
): StaffCredit {
  return {
    episodeInfo: credit.eps || undefined,
    id: credit.id,
    imageUrl:
      credit.images?.medium || credit.images?.small || undefined,
    isOrganization: credit.type === 2,
    name: credit.name,
    role: credit.relation,
  };
}

export const bangumiStaffProvider: StaffProvider = {
  async getSubjectStaff(subjectId, signal) {
    const credits = await getBangumiSubjectStaff(subjectId, signal);
    return credits.map(toStaffCredit);
  },
};
