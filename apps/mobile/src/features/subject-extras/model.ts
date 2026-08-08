export type SubjectCharacter = {
  actors: {
    id: number;
    imageUrl?: string;
    name: string;
  }[];
  id: number;
  imageUrl?: string;
  name: string;
  role: string;
  summary: string;
};

export type RelatedSubject = {
  coverUrl?: string;
  id: number;
  relation: string;
  title: string;
  type: number;
};

export type SubjectExtrasProvider = {
  getCharacters: (
    subjectId: number,
    signal?: AbortSignal,
  ) => Promise<SubjectCharacter[]>;
  getRelations: (
    subjectId: number,
    signal?: AbortSignal,
  ) => Promise<RelatedSubject[]>;
};
