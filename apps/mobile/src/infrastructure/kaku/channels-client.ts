import { z } from 'zod';

import type { ChannelSubjectList } from '@/features/channels/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client.ts';

const responseSchema = z.object({
  items: z.array(
    z.object({
      attentionCount: z.number().int().nonnegative().optional(),
      coverUrl: z.string().url().optional(),
      id: z.number().int().positive(),
      score: z.number().optional(),
      title: z.string(),
      type: z.number().int(),
    }),
  ),
});

export async function getChannelSubjects(
  subjectType: number,
  signal?: AbortSignal,
): Promise<ChannelSubjectList> {
  const response = await fetchPublicKaku(
    `/public/channels?type=${subjectType}`,
    { signal },
  );

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return responseSchema.parse(await response.json());
}
