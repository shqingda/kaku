export type CatalogEpisode = {
  airDate?: string;
  description: string;
  discussionCount: number;
  duration?: string;
  id: number;
  number: number;
  originalTitle: string;
  title: string;
};

export type CatalogSubject = {
  collectionStats?: {
    completed: number;
    doing: number;
    dropped: number;
    onHold: number;
    wish: number;
  };
  coverUrl?: string;
  details: {
    edition?: string;
    gameGenre?: string;
    pageCount?: string;
    platforms?: string;
  };
  episodes: CatalogEpisode[];
  format?: string;
  id: number;
  info: {
    key: string;
    value: string;
  }[];
  originalTitle: string;
  rating?: {
    distribution: Record<number, number>;
    rank?: number;
    score: number;
    votes: number;
  };
  releaseDate?: string;
  summary: string;
  tags: string[];
  title: string;
  totalEpisodes: number;
  type: number;
  year?: number;
};

export type CatalogProvider = {
  getSubject: (
    subjectId: number,
    signal?: AbortSignal,
  ) => Promise<CatalogSubject>;
};
