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

type EntityAppearance = {
  relation: string;
  subjectId: number;
  subjectTitle: string;
};

export type EntityRelatedPeer = {
  appearances: EntityAppearance[];
  id: number;
  imageUrl?: string;
  name: string;
};

export type PublicEntityDetail = {
  categoryLabels: string[];
  collectionCount: number;
  commentCount: number;
  id: number;
  // Full-size image for the fullscreen viewer; thumbnailUrl is sized for the header portrait.
  imageUrl?: string;
  metadata: EntityMetadata[];
  name: string;
  relatedPeers: EntityRelatedPeer[];
  relatedSubjects: EntityRelatedSubject[];
  summary: string;
  thumbnailUrl?: string;
};
