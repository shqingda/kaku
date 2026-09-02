import type { DiscussionReply } from '@/features/discussions/model';

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

export type EntityAppearance = {
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
  imageUrl?: string;
  metadata: EntityMetadata[];
  name: string;
  relatedPeers: EntityRelatedPeer[];
  relatedSubjects: EntityRelatedSubject[];
  summary: string;
};
