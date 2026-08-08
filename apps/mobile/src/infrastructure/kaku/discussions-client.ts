import { z } from 'zod';

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
