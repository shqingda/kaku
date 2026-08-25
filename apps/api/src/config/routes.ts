import type { Context } from 'hono';
import type { Hono } from 'hono';
import { z } from 'zod';

import type { Env } from '../env.ts';
import {
  getPublicCache,
  servePublicCached,
  type PublicCache,
} from '../public-cache.ts';

const CONFIG_KEY = 'public-config:v1';
const CONFIG_CACHE_TTL_SECONDS = 300;

const storedConfigSchema = z.object({
  features: z.object({
    preferenceCloudSync: z.boolean(),
  }),
  notice: z.string().trim().min(1).max(240).nullable(),
  revision: z.number().int().nonnegative(),
});

export type PublicConfig = z.infer<typeof storedConfigSchema>;
type ConfigStore = Pick<KVNamespace, 'get'>;

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  features: { preferenceCloudSync: true },
  notice: null,
  revision: 0,
};

export type ConfigDependencies = {
  cache?: PublicCache;
  createConfigStore?: (env: Env) => ConfigStore;
};

function jsonConfig(
  context: Context<{ Bindings: Env }>,
  config: PublicConfig,
  degraded: boolean,
  source: 'default' | 'kv',
) {
  return context.json(
    { config, degraded, source },
    200,
    {
      'Cache-Control': `public, max-age=${CONFIG_CACHE_TTL_SECONDS}, stale-while-revalidate=86400`,
    },
  );
}

export function registerConfigRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: ConfigDependencies = {},
) {
  app.get('/config', async (context) =>
    servePublicCached(
      context,
      getPublicCache(dependencies.cache),
      CONFIG_CACHE_TTL_SECONDS,
      async () => {
        const store =
          dependencies.createConfigStore?.(context.env) ??
          context.env.KAKU_CONFIG;

        try {
          const stored = await store.get(CONFIG_KEY, {
            cacheTtl: CONFIG_CACHE_TTL_SECONDS,
            type: 'json',
          });

          if (stored === null) {
            return jsonConfig(context, DEFAULT_PUBLIC_CONFIG, false, 'default');
          }

          const parsed = storedConfigSchema.safeParse(stored);
          if (parsed.success) {
            return jsonConfig(context, parsed.data, false, 'kv');
          }

          console.warn(
            JSON.stringify({
              key: CONFIG_KEY,
              message: 'invalid public config in KV',
            }),
          );
          return jsonConfig(context, DEFAULT_PUBLIC_CONFIG, true, 'default');
        } catch (error) {
          console.error(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              key: CONFIG_KEY,
              message: 'failed to read public config from KV',
            }),
          );
          return jsonConfig(context, DEFAULT_PUBLIC_CONFIG, true, 'default');
        }
      },
    ),
  );
}
