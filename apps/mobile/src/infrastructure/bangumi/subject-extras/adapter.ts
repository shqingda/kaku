import type { SubjectCharacter } from '../../../features/subject-extras/model.ts';
import type {
  BangumiSubjectCharactersResponse,
} from '../api-v0/schemas.ts';
import type { BangumiSubjectCharacterName } from '../api-next/schemas.ts';

export function mapBangumiSubjectCharacters(
  characters: BangumiSubjectCharactersResponse,
  localizedCharacters: BangumiSubjectCharacterName[],
): SubjectCharacter[] {
  const localizedNames = new Map(
    localizedCharacters.map((character) => [
      character.id,
      character.nameCN.trim(),
    ]),
  );

  return characters.map((character) => ({
    actors: character.actors.map((actor) => ({
      id: actor.id,
      imageUrl: actor.images?.medium ?? actor.images?.small,
      name: actor.name,
    })),
    id: character.id,
    imageUrl: character.images?.medium ?? character.images?.small,
    name: localizedNames.get(character.id) || character.name,
    role: character.relation,
    summary: character.summary,
  }));
}
