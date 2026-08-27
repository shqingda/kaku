import {
  createCharacterComment,
  createEpisodeComment,
  createGroupTopicReply,
  createPersonComment,
  createReviewReply,
  createSubjectTopicReply,
  deleteBlogComment,
  deleteCharacterComment,
  deleteEpisodeComment,
  deleteGroupPost,
  deletePersonComment,
  deleteSubjectPost,
  editBlogComment,
  editCharacterComment,
  editEpisodeComment,
  editGroupPost,
  editPersonComment,
  editSubjectPost,
} from '../../infrastructure/kaku/discussions-client.ts';
import { queryKeys } from '../../lib/query-keys.ts';

export type DiscussionReplyKind =
  | 'character'
  | 'episode'
  | 'group-topic'
  | 'person'
  | 'review'
  | 'subject-topic';

export type DiscussionReplyTarget = {
  id: number;
  kind: DiscussionReplyKind;
};

export type CreateDiscussionReplyInput = {
  content: string;
  replyTo?: number;
};

type AuthenticatedRequest = Parameters<typeof createEpisodeComment>[0];

type CreateInput = CreateDiscussionReplyInput & { turnstileToken: string };

type DiscussionReplyOps = {
  create: (
    request: AuthenticatedRequest,
    targetId: number,
    input: CreateInput,
  ) => Promise<{ id: number }>;
  edit: (
    request: AuthenticatedRequest,
    postId: number,
    content: string,
  ) => ReturnType<typeof editSubjectPost>;
  queryKey: (targetId: number) => readonly unknown[];
  remove: (
    request: AuthenticatedRequest,
    postId: number,
  ) => ReturnType<typeof deleteSubjectPost>;
};

const DISCUSSION_REPLY_OPS: Record<DiscussionReplyKind, DiscussionReplyOps> = {
  character: {
    create: (request, targetId, input) =>
      createCharacterComment(request, { ...input, characterId: targetId }),
    edit: editCharacterComment,
    queryKey: (targetId) => queryKeys.entityComments('character', targetId),
    remove: deleteCharacterComment,
  },
  episode: {
    create: (request, targetId, input) =>
      createEpisodeComment(request, { ...input, episodeId: targetId }),
    edit: editEpisodeComment,
    queryKey: (targetId) => queryKeys.episodeComments(targetId),
    remove: deleteEpisodeComment,
  },
  'group-topic': {
    create: (request, targetId, input) =>
      createGroupTopicReply(request, { ...input, topicId: targetId }),
    edit: editGroupPost,
    queryKey: (targetId) => queryKeys.groupTopic(targetId),
    remove: deleteGroupPost,
  },
  person: {
    create: (request, targetId, input) =>
      createPersonComment(request, { ...input, personId: targetId }),
    edit: editPersonComment,
    queryKey: (targetId) => queryKeys.entityComments('person', targetId),
    remove: deletePersonComment,
  },
  review: {
    create: (request, targetId, input) =>
      createReviewReply(request, { ...input, reviewId: targetId }),
    edit: editBlogComment,
    queryKey: (targetId) => queryKeys.subjectReview(targetId),
    remove: deleteBlogComment,
  },
  'subject-topic': {
    create: (request, targetId, input) =>
      createSubjectTopicReply(request, { ...input, topicId: targetId }),
    edit: editSubjectPost,
    queryKey: (targetId) => queryKeys.subjectTopic(targetId),
    remove: deleteSubjectPost,
  },
};

export function discussionReplyOps(target: DiscussionReplyTarget) {
  return DISCUSSION_REPLY_OPS[target.kind];
}

export function discussionReplyQueryKey(target: DiscussionReplyTarget) {
  return discussionReplyOps(target).queryKey(target.id);
}
