import { z } from 'zod';

import type { BrowseSubjectPage } from './model.ts';

const BANGUMI_NEXT_URL = 'https://next.bgm.tv';

const browsePageSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int().positive(),
      images: z.object({ common: z.string().optional(), medium: z.string().optional() }).nullish(),
      name: z.string(),
      nameCN: z.string(),
      rating: z.object({ score: z.number() }).nullish(),
      type: z.number().int(),
    }),
  ),
  total: z.number().int().nonnegative(),
});

export class BangumiBrowseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiBrowseError';
    this.status = status;
  }
}

export async function browseBangumiSubjects({
  fetcher = fetch,
  page,
  sort,
  subjectType,
  tags = [],
  year,
}: {
  fetcher?: typeof fetch;
  page: number;
  sort: string;
  subjectType: number;
  tags?: string[];
  year?: number;
}): Promise<BrowseSubjectPage> {
  const url = new URL('/p1/subjects', BANGUMI_NEXT_URL);
  url.searchParams.set('type', String(subjectType));
  url.searchParams.set('sort', sort);
  url.searchParams.set('page', String(page));
  if (year) url.searchParams.set('year', String(year));
  for (const tag of tags) url.searchParams.append('tags', tag);

  const response = await fetcher(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Kaku/0.1 (https://github.com/shqingda/kaku)',
    },
  });

  if (!response.ok) {
    throw new BangumiBrowseError(
      response.status,
      response.status >= 500
        ? 'Bangumi 分类浏览暂时不可用。'
        : 'Bangumi 无法返回这组筛选结果。',
    );
  }

  const parsed = browsePageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new BangumiBrowseError(502, 'Bangumi 返回了无法识别的分类数据。');
  }

  return {
    items: parsed.data.data.map((subject) => ({
      coverUrl: subject.images?.common ?? subject.images?.medium,
      id: subject.id,
      score: subject.rating?.score,
      title: subject.nameCN.trim() || subject.name,
      type: subject.type,
    })),
    nextPage:
      parsed.data.data.length > 0 && page < parsed.data.total
        ? page + 1
        : undefined,
    totalPages: parsed.data.total,
  };
}
