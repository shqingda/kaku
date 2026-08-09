export type PublicWikiRevision = {
  author: string;
  authorUsername: string;
  editedAt: number;
  note: string;
  revisionUrl: string;
  subjectId: number;
  title: string;
};

export type PublicWikiRevisionFeed = {
  items: PublicWikiRevision[];
};
