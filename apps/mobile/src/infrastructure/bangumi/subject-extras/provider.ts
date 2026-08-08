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
  async getCharacters(subjectId, signal) {
    const [characters, localizedCharacters] = await Promise.all([
      getBangumiSubjectCharacters(subjectId, signal),
      getBangumiSubjectCharacterNames(subjectId, signal),
    ]);
    return mapBangumiSubjectCharacters(characters, localizedCharacters);
  },
  async getRelations(subjectId, signal) {
    const relations = await getBangumiSubjectRelations(subjectId, signal);
    return relations.map(toRelatedSubject);
  },
};
