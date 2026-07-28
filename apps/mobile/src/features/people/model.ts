export type EntityMetadata = {
  label: string;
  value: string;
};

export type EntityRelatedSubject = {
  coverUrl?: string;
  id: number;
  relation: string;
  title: string;
  type: number;
};

export type PublicEntityDetail = {
  id: number;
  imageUrl?: string;
  metadata: EntityMetadata[];
  name: string;
  relatedSubjects: EntityRelatedSubject[];
  summary: string;
};

export type PeopleProvider = {
  getCharacter: (characterId: number) => Promise<PublicEntityDetail>;
  getPerson: (personId: number) => Promise<PublicEntityDetail>;
};
