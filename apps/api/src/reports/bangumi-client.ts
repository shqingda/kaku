import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

export class BangumiReportError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiReportError';
    this.status = status;
  }
}

// 被举报对象类型与举报理由，与 Bangumi P1 的枚举保持一致。
export const REPORT_TYPES = {
  user: 6,
  groupTopic: 7,
  groupReply: 8,
  subjectTopic: 9,
  subjectReply: 10,
  episodeReply: 11,
  characterReply: 12,
  personReply: 13,
  blog: 14,
  blogReply: 15,
  timeline: 16,
  timelineReply: 17,
  index: 18,
  indexReply: 19,
} as const;

export const REPORT_REASONS = {
  abuse: 1,
  spam: 2,
  political: 3,
  illegal: 4,
  privacy: 5,
  cheatScore: 6,
  flame: 7,
  advertisement: 8,
  spoiler: 9,
  other: 99,
} as const;

const createdReportSchema = z.object({ message: z.string() });

export async function createBangumiReport({
  accessToken,
  comment,
  fetcher = fetch,
  id,
  reason,
  type,
}: {
  accessToken: string;
  comment?: string;
  fetcher?: typeof fetch;
  id: number;
  reason: number;
  type: number;
}): Promise<{ message: string }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}/report`, {
    body: JSON.stringify({ comment, id, type, value: reason }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': BANGUMI_USER_AGENT,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new BangumiReportError(
      response.status,
      response.status === 429
        ? '举报得太频繁了，请稍后再试。'
        : response.status >= 500
          ? 'Bangumi 暂时不可用，请稍后重试。'
          : '举报没有提交成功，请稍后重试。',
    );
  }

  return createdReportSchema.parse(await response.json());
}
