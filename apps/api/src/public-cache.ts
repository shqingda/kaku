import type { Context } from 'hono';

// 公共 GET 路由统一走 Cloudflare Cache API：命中直接返回，未命中请求上游后写入。
// Worker 只设置 Cache-Control 头不会自动进入边缘缓存，必须显式 cache.put。
export type PublicCache = Pick<Cache, 'match' | 'put'>;

export function getPublicCache(cache?: PublicCache): PublicCache | undefined {
  return cache ?? (typeof caches === 'undefined' ? undefined : caches.default);
}

export function withCacheStatus(response: Response, status: 'HIT' | 'MISS') {
  const headers = new Headers(response.headers);
  headers.set('X-Kaku-Cache', status);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function storePublicResponse(cache: PublicCache, key: Request, response: Response) {
  try {
    await cache.put(key, response.clone());
  } catch {
    // Cache failures must not discard successful upstream data or expose request details.
    console.warn('public_cache_write_failed');
  }
}

export async function servePublicCached(
  context: Context,
  cache: PublicCache | undefined,
  produce: () => Promise<Response>,
  cacheKey = new Request(new URL(context.req.url), { method: 'GET' }),
): Promise<Response> {
  try {
    const cached = await cache?.match(cacheKey);
    if (cached) return withCacheStatus(cached, 'HIT');
  } catch {
    console.warn('public_cache_read_failed');
  }

  const response = await produce();
  if (response.ok && cache) {
    const write = storePublicResponse(cache, cacheKey, response);
    try {
      context.executionCtx.waitUntil(write);
    } catch {
      // Hono throws when no Worker context exists. Keep the write owned by this
      // request in other hosts/tests instead of leaving an untracked promise.
      await write;
    }
  }
  return withCacheStatus(response, 'MISS');
}
