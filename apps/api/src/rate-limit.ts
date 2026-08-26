import type { Context } from 'hono';

import type { PublicCache } from './public-cache.ts';

// 轻量限流：按客户端 IP + 读/写分桶，计数写在 Cache API。
// 没有跨 isolate 强一致，只挡突发滥用；不够再评估 Durable Objects。
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const PUBLIC_REQUEST_LIMIT = 180;
export const WRITE_REQUEST_LIMIT = 40;

const RATE_LIMIT_CACHE_ORIGIN = 'https://rate-limit.kaku.internal';

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export function getClientIp(headers: Headers) {
  const connectingIp = headers.get('CF-Connecting-IP')?.trim();
  if (connectingIp) return connectingIp;

  const forwarded = headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  return 'unknown';
}

export function isWriteMethod(method: string) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

export function getRateLimitKey(ip: string, write: boolean) {
  return `${write ? 'write' : 'public'}:${ip}`;
}

function cacheRequest(key: string) {
  return new Request(`${RATE_LIMIT_CACHE_ORIGIN}/${encodeURIComponent(key)}`);
}

async function readRecord(
  cache: PublicCache,
  key: string,
): Promise<RateLimitRecord | null> {
  const cached = await cache.match(cacheRequest(key));
  if (!cached) return null;

  try {
    const parsed = (await cached.json()) as RateLimitRecord;
    if (
      typeof parsed?.count === 'number' &&
      Number.isInteger(parsed.count) &&
      parsed.count >= 0 &&
      typeof parsed?.resetAt === 'number'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function consumeRateLimit(
  cache: PublicCache | undefined,
  key: string,
  limit: number,
  now: number,
  windowSeconds = RATE_LIMIT_WINDOW_SECONDS,
): Promise<RateLimitResult> {
  if (!cache) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0,
    };
  }

  const existing = await readRecord(cache, key);
  const resetAt =
    existing && existing.resetAt > now
      ? existing.resetAt
      : now + windowSeconds * 1000;
  const count = (existing && existing.resetAt > now ? existing.count : 0) + 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  await cache.put(
    cacheRequest(key),
    new Response(JSON.stringify({ count, resetAt }), {
      headers: {
        'Cache-Control': `max-age=${retryAfterSeconds}`,
        'Content-Type': 'application/json',
      },
    }),
  );

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

export async function enforceRateLimit(
  context: Context,
  cache: PublicCache | undefined,
  now: number,
) {
  if (context.req.path === '/health') {
    return null;
  }

  const write = isWriteMethod(context.req.method);
  const result = await consumeRateLimit(
    cache,
    getRateLimitKey(getClientIp(context.req.raw.headers), write),
    write ? WRITE_REQUEST_LIMIT : PUBLIC_REQUEST_LIMIT,
    now,
  );

  if (result.allowed) {
    return null;
  }

  return context.json(
    {
      error: 'rate_limited',
      message: '请求过于频繁，请稍后再试。',
    },
    429,
    {
      'Retry-After': String(result.retryAfterSeconds),
      'RateLimit-Limit': String(result.limit),
      'RateLimit-Remaining': '0',
    },
  );
}
