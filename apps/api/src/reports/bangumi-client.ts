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
