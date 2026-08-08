import { z } from 'zod';

import { readErrorMessage } from './auth-client';

const createdReplySchema = z.object({ id: z.number().int().positive() });

type AuthenticatedRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

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
  const response = await request(`/me/subject-topics/${topicId}/replies`, {
    body: JSON.stringify({ content, replyTo, turnstileToken }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createdReplySchema.parse(await response.json());
}
