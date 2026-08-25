import { z } from 'zod';

import { fetchPublicKaku, KakuApiError, readErrorMessage } from './auth-client';

const publicConfigSchema = z.object({
  config: z.object({
    features: z.object({ preferenceCloudSync: z.boolean() }),
    notice: z.string().nullable(),
    revision: z.number().int().nonnegative(),
  }),
  degraded: z.boolean(),
  source: z.enum(['default', 'kv']),
});

export type PublicConfigResponse = z.infer<typeof publicConfigSchema>;

export async function getPublicConfig(
  signal?: AbortSignal,
): Promise<PublicConfigResponse> {
  const response = await fetchPublicKaku('/config', { signal });
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }
  return publicConfigSchema.parse(await response.json());
}
