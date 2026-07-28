import type {
  RelatedSubject,
  SubjectCharacter,
  SubjectExtrasProvider,
} from '@/features/subject-extras/model';

import {
  getBangumiSubjectCharacters,
  getBangumiSubjectRelations,
} from '../api-v0/client';
import type {
  BangumiSubjectCharactersResponse,
  BangumiSubjectRelationsResponse,
} from '../api-v0/schemas';

function toCharacter(
  character: BangumiSubjectCharactersResponse[number],
): SubjectCharacter {
  return {
    actors: character.actors.map((actor) => ({
      id: actor.id,
      imageUrl: actor.images?.medium ?? actor.images?.small,
      name: actor.name,
    })),
    id: character.id,
    imageUrl: character.images?.medium ?? character.images?.small,
    name: character.name,
    role: character.relation,
    summary: character.summary,
  };
}

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
    const characters = await getBangumiSubjectCharacters(subjectId);
    return characters.map(toCharacter);
  },
  async getRelations(subjectId) {
    const relations = await getBangumiSubjectRelations(subjectId);
    return relations.map(toRelatedSubject);
  },
};
