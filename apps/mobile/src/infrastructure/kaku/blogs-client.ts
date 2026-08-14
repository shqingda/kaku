import { z } from 'zod';

import type {
  BlogFilter,
  GlobalBlogPage,
} from '@/features/blogs/model';
import {
  fetchPublicKaku,
  KakuApiError,
  readErrorMessage,
} from './auth-client.ts';

const blogPageSchema = z.object({
  items: z.array(
    z.object({
      author: z.string(),
      authorUsername: z.string(),
      coverUrl: z.string().url().optional(),
      id: z.number().int().positive(),
      replyCount: z.number().int().nonnegative(),
      summary: z.string(),
      title: z.string(),
      updatedAt: z.number().int().nonnegative(),
    }),
  ),
  nextPage: z.number().int().positive().optional(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive().optional(),
});

export async function getGlobalBlogs(
  type: BlogFilter,
  page: number,
  signal?: AbortSignal,
): Promise<GlobalBlogPage> {
  const query = new URLSearchParams({
    page: String(page),
    type,
  });
  const response = await fetchPublicKaku(`/public/blogs?${query}`, { signal });

  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return blogPageSchema.parse(await response.json());
}
