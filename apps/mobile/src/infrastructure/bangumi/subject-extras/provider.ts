import type {
  RelatedSubject,
  SubjectExtrasProvider,
} from '@/features/subject-extras/model';

import {
  getBangumiSubjectCharacters,
  getBangumiSubjectRelations,
} from '../api-v0/client';
import { getBangumiSubjectCharacterNames } from '../api-next/client';
import type {
  BangumiSubjectRelationsResponse,
} from '../api-v0/schemas';
import { mapBangumiSubjectCharacters } from './adapter';

function toRelatedSubject(
  subject: BangumiSubjectRelationsResponse[number],
): RelatedSubject {
  return {
    coverUrl:
      subject.images?.common ??
      subject.images?.medium ??
      subject.images?.small,
    id: subject.id,
    relation: subject.relation,
    title: subject.name_cn.trim() || subject.name,
    type: subject.type,
  };
}

export const bangumiSubjectExtrasProvider: SubjectExtrasProvider = {
  async getCharacters(subjectId) {
    const [characters, localizedCharacters] = await Promise.all([
      getBangumiSubjectCharacters(subjectId),
      getBangumiSubjectCharacterNames(subjectId),
    ]);
    return mapBangumiSubjectCharacters(characters, localizedCharacters);
  },
  async getRelations(subjectId) {
    const relations = await getBangumiSubjectRelations(subjectId);
    return relations.map(toRelatedSubject);
  },
};
