import { z } from 'zod';

import { KakuApiError, readErrorMessage } from './auth-client.ts';

const exportRecordSchema = z.object({
  byteSize: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  format: z.enum(['json', 'csv']),
  id: z.string().min(1),
});

const listSchema = z.object({
  exports: z.array(exportRecordSchema),
});

const createdSchema = z.object({
  export: exportRecordSchema,
});

export type CloudExportRecord = z.infer<typeof exportRecordSchema>;

async function ensureOk(response: Response) {
  if (response.ok) return response;
  throw new KakuApiError(await readErrorMessage(response), response.status);
}

export async function listCloudExports(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal,
): Promise<CloudExportRecord[]> {
  const response = await ensureOk(await request('/me/exports', { signal }));
  return listSchema.parse(await response.json()).exports;
}

export async function createCloudExport(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  input: { content: string; format: 'json' | 'csv' },
): Promise<CloudExportRecord> {
  const response = await ensureOk(
    await request('/me/exports', {
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
  );
  return createdSchema.parse(await response.json()).export;
}

export async function downloadCloudExport(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  id: string,
): Promise<string> {
  const response = await ensureOk(await request(`/me/exports/${id}`));
  return response.text();
}

export async function deleteCloudExport(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  id: string,
): Promise<void> {
  await ensureOk(
    await request(`/me/exports/${id}`, {
      method: 'DELETE',
    }),
  );
}
