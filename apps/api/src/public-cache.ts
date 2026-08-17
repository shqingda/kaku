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

export async function servePublicCached(
  context: Context,
  cache: PublicCache | undefined,
  ttlSeconds: number,
  produce: () => Promise<Response>,
): Promise<Response> {
  const cacheKey = new Request(new URL(context.req.url), { method: 'GET' });
  const cached = await cache?.match(cacheKey);

  if (cached) {
    return withCacheStatus(cached, 'HIT');
  }

  const response = await produce();
  if (response.ok) {
    await cache?.put(cacheKey, response.clone());
  }
  return withCacheStatus(response, 'MISS');
}
