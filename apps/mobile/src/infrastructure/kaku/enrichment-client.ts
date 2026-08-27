import { z } from 'zod';

import { KakuApiError, readErrorMessage } from './auth-client.ts';

const enrichmentSchema = z.object({
  enrichment: z.object({
    matched: z.boolean(),
    provider: z.literal('anilist'),
    score: z.number().optional(),
    title: z.string().optional(),
    trailerUrl: z.string().url().optional(),
    url: z.string().url().optional(),
  }),
});

export type SubjectEnrichment = z.infer<typeof enrichmentSchema>['enrichment'];

const KAKU_API_URL = 'https://kaku-api.shqingda.workers.dev';

export async function getSubjectEnrichment(
  subjectId: number,
  signal?: AbortSignal,
): Promise<SubjectEnrichment> {
  const response = await fetch(
    `${KAKU_API_URL}/public/subjects/${subjectId}/enrichment`,
    { signal },
  );

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  return enrichmentSchema.parse(await response.json()).enrichment;
}
