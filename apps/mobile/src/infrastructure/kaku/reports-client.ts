import { z } from 'zod';

import { readErrorMessage } from './auth-client.ts';

const reportResultSchema = z.object({ message: z.string() });

export type ReportInput = {
  comment?: string;
  id: number;
  reason: number;
  type: number;
};

export async function createReport(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  input: ReportInput,
): Promise<string> {
  const response = await request('/me/reports', {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return reportResultSchema.parse(await response.json()).message;
}
