import { z } from 'zod';

import type { PublicWikiRevisionFeed } from '@/features/wiki/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client';

const wikiRevisionFeedSchema = z.object({
  items: z.array(
    z.object({
      author: z.string(),
      authorUsername: z.string(),
      editedAt: z.number().int().nonnegative(),
      note: z.string(),
      revisionUrl: z.url(),
      subjectId: z.number().int().positive(),
      title: z.string(),
    }),
  ),
});

export async function getWikiRevisionFeed(
  signal?: AbortSignal,
): Promise<PublicWikiRevisionFeed> {
  const response = await fetchPublicKaku('/public/wiki/revisions', { signal });
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return wikiRevisionFeedSchema.parse(await response.json());
}
