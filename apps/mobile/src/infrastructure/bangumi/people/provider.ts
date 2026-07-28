import type {
  EntityMetadata,
  PeopleProvider,
  PublicEntityDetail,
} from '@/features/people/model';

import {
  getBangumiCharacter,
  getBangumiPerson,
} from '../api-v0/client';
import type {
  BangumiEntityDetailResponse,
  BangumiEntitySubjectsResponse,
} from '../api-v0/schemas';

function valueToText(
  value: string | { k?: string; v: string }[],
) {
  return typeof value === 'string'
    ? value
    : value.map((item) => item.v).join(' / ');
}

function toMetadata(detail: BangumiEntityDetailResponse): EntityMetadata[] {
  const metadata =
    detail.infobox?.map((item) => ({
      label: item.key,
      value: valueToText(item.value),
    })) ?? [];
  const birthday = [detail.birth_year, detail.birth_mon, detail.birth_day]
    .filter((value): value is number => typeof value === 'number')
    .join('-');

  if (birthday) {
    metadata.unshift({ label: '生日', value: birthday });
  }
  if (detail.gender) {
    metadata.unshift({ label: '性别', value: detail.gender });
  }

  return metadata;
}

function toEntityDetail(
  detail: BangumiEntityDetailResponse,
  subjects: BangumiEntitySubjectsResponse,
): PublicEntityDetail {
  return {
    id: detail.id,
    imageUrl: detail.images?.large ?? detail.images?.medium,
    metadata: toMetadata(detail),
    name: detail.name,
    relatedSubjects: subjects.map((subject) => ({
      coverUrl: subject.image || undefined,
      id: subject.id,
      relation: subject.staff,
      title: subject.name_cn.trim() || subject.name,
      type: subject.type,
    })),
    summary: detail.summary,
  };
}

export const bangumiPeopleProvider: PeopleProvider = {
  async getCharacter(characterId) {
    const { detail, subjects } = await getBangumiCharacter(characterId);
    return toEntityDetail(detail, subjects);
  },
  async getPerson(personId) {
    const { detail, subjects } = await getBangumiPerson(personId);
    return toEntityDetail(detail, subjects);
  },
};
