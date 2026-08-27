import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';

import type { EnrichmentTitles } from './match.ts';

const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  name_cn: z.string().optional().default(''),
  type: z.number().int(),
});

export class BangumiSubjectError extends Error {
  status: number;

  constructor(status: number) {
    super(
      status >= 500
        ? 'Bangumi 条目服务暂时不可用。'
        : '条目暂时无法读取。',
    );
    this.name = 'BangumiSubjectError';
    this.status = status;
  }
}

export type BangumiSubjectSummary = EnrichmentTitles & {
  id: number;
  type: number;
};

export async function getBangumiSubjectSummary({
  fetcher = fetch,
  subjectId,
}: {
  fetcher?: typeof fetch;
  subjectId: number;
}): Promise<BangumiSubjectSummary> {
  const response = await fetcher(`https://api.bgm.tv/v0/subjects/${subjectId}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new BangumiSubjectError(response.status);
  }

  const subject = subjectSchema.parse(await response.json());
  return {
    id: subject.id,
    originalTitle: subject.name,
    title: subject.name_cn || subject.name,
    type: subject.type,
  };
}
