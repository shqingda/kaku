import { z } from 'zod';

import {
  bangumiBlogCommentsSchema,
  bangumiBlogSchema,
  bangumiEpisodeCommentsSchema,
  bangumiGroupTopicSchema,
  bangumiSubjectTopicSchema,
} from '@/infrastructure/bangumi/api-next/schemas';
import { readErrorMessage } from './auth-client';

const createdReplySchema = z.object({ id: z.number().int().positive() });

type AuthenticatedRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

type CreateReplyInput = {
  content: string;
  replyTo?: number;
  turnstileToken: string;
};

export async function getAuthenticatedSubjectTopic(
  request: AuthenticatedRequest,
  topicId: number,
  signal?: AbortSignal,
) {
  const response = await request(`/me/subject-topics/${topicId}`, { signal });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return bangumiSubjectTopicSchema.parse(await response.json());
}

async function getAuthenticatedDiscussion(
  request: AuthenticatedRequest,
  path: string,
  signal?: AbortSignal,
) {
  const response = await request(path, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

export async function getAuthenticatedGroupTopic(
  request: AuthenticatedRequest,
  topicId: number,
  signal?: AbortSignal,
) {
  const response = await request(`/me/group-topics/${topicId}`, { signal });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return bangumiGroupTopicSchema.parse(await response.json());
}

export async function getAuthenticatedEpisodeComments(
  request: AuthenticatedRequest,
  episodeId: number,
  signal?: AbortSignal,
) {
  return bangumiEpisodeCommentsSchema.parse(
    await getAuthenticatedDiscussion(
      request,
      `/me/episodes/${episodeId}/comments`,
      signal,
    ),
  );
}

export async function getAuthenticatedReview(
  request: AuthenticatedRequest,
  reviewId: number,
  signal?: AbortSignal,
) {
  const json = await getAuthenticatedDiscussion(
    request,
    `/me/reviews/${reviewId}`,
    signal,
  );
  const reviewSchema = z.object({
    blog: bangumiBlogSchema,
    comments: bangumiBlogCommentsSchema,
  });

  return reviewSchema.parse(json);
}

async function createReply(
  request: AuthenticatedRequest,
  path: string,
  input: CreateReplyInput,
) {
  const response = await request(path, {
    body: JSON.stringify({
      content: input.content,
      replyTo: input.replyTo,
      turnstileToken: input.turnstileToken,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createdReplySchema.parse(await response.json());
}

export async function createSubjectTopicReply(
  request: AuthenticatedRequest,
  {
    content,
    replyTo,
    topicId,
    turnstileToken,
  }: {
    content: string;
    replyTo?: number;
    topicId: number;
    turnstileToken: string;
  },
) {
  return createReply(request, `/me/subject-topics/${topicId}/replies`, {
    content,
    replyTo,
    turnstileToken,
  });
}

export async function createGroupTopicReply(
  request: AuthenticatedRequest,
  input: {
    content: string;
    replyTo?: number;
    topicId: number;
    turnstileToken: string;
  },
) {
  return createReply(request, `/me/group-topics/${input.topicId}/replies`, input);
}

export async function createEpisodeComment(
  request: AuthenticatedRequest,
  input: CreateReplyInput & { episodeId: number },
) {
  return createReply(request, `/me/episodes/${input.episodeId}/comments`, input);
}

export async function createReviewReply(
  request: AuthenticatedRequest,
  input: CreateReplyInput & { reviewId: number },
) {
  return createReply(request, `/me/reviews/${input.reviewId}/replies`, input);
}

type CreateTopicInput = {
  content: string;
  title: string;
  turnstileToken: string;
};

async function createTopic(
  request: AuthenticatedRequest,
  path: string,
  input: CreateTopicInput,
) {
  const response = await request(path, {
    body: JSON.stringify({
      content: input.content,
      title: input.title,
      turnstileToken: input.turnstileToken,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createdReplySchema.parse(await response.json());
}

export async function createSubjectTopic(
  request: AuthenticatedRequest,
  input: CreateTopicInput & { subjectId: number },
) {
  return createTopic(
    request,
    `/me/subjects/${input.subjectId}/topics`,
    input,
  );
}

export async function createGroupTopic(
  request: AuthenticatedRequest,
  input: CreateTopicInput & { groupName: string },
) {
  return createTopic(
    request,
    `/me/groups/${encodeURIComponent(input.groupName)}/topics`,
    input,
  );
}

async function deletePost(request: AuthenticatedRequest, path: string) {
  const response = await request(path, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function deleteSubjectPost(
  request: AuthenticatedRequest,
  postId: number,
) {
  return deletePost(request, `/me/subject-posts/${postId}`);
}

export async function deleteGroupPost(
  request: AuthenticatedRequest,
  postId: number,
) {
  return deletePost(request, `/me/group-posts/${postId}`);
}

async function editPost(
  request: AuthenticatedRequest,
  path: string,
  content: string,
) {
  const response = await request(path, {
    body: JSON.stringify({ content }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function editSubjectPost(
  request: AuthenticatedRequest,
  postId: number,
  content: string,
) {
  return editPost(request, `/me/subject-posts/${postId}`, content);
}

export async function editGroupPost(
  request: AuthenticatedRequest,
  postId: number,
  content: string,
) {
  return editPost(request, `/me/group-posts/${postId}`, content);
}
