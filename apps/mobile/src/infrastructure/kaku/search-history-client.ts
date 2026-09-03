import { z } from 'zod';

import type { SearchHistoryRecord } from '@/features/search/search-history-model';
import { KakuApiError, readErrorMessage } from './auth-client.ts';

const responseSchema = z.object({
  history: z.object({
    items: z.array(z.string()),
    updatedAt: z.number().nonnegative().nullable(),
  }),
});

export async function parseSearchHistoryResponse(
  response: Response,
): Promise<SearchHistoryRecord> {
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return responseSchema.parse(await response.json()).history;
}
