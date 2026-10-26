import type { Context } from 'hono';

import type { PublicCache } from './public-cache.ts';

// Public reads use best-effort edge throttling. Authentication and writes use
// D1's atomic counter so concurrent Worker instances share one budget.
const RATE_LIMIT_WINDOW_SECONDS = 60;
export const PUBLIC_REQUEST_LIMIT = 180;
export const WRITE_REQUEST_LIMIT = 40;

const RATE_LIMIT_CACHE_ORIGIN = 'https://rate-limit.kaku.internal';

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  consume(input: { key: string; limit: number; now: number; windowSeconds?: number }): Promise<RateLimitResult>;
};

export function getRateLimitPolicy(path: string, method: string) {
  if (path === '/auth/bangumi/start') return { bucket: 'login-start', limit: 10, atomic: true };
  if (path === '/auth/bangumi/callback') return { bucket: 'login-callback', limit: 10, atomic: true };
  if (path === '/auth/session' && method === 'POST') return { bucket: 'session-exchange', limit: 10, atomic: true };
  if (path === '/auth/session/refresh') return { bucket: 'session-refresh', limit: 30, atomic: true };
  if (path.startsWith('/auth/')) return { bucket: isWriteMethod(method) ? 'auth-write' : 'auth-read', limit: isWriteMethod(method) ? WRITE_REQUEST_LIMIT : PUBLIC_REQUEST_LIMIT, atomic: true };
  if (isWriteMethod(method)) return { bucket: 'business-write', limit: WRITE_REQUEST_LIMIT, atomic: true };
  return { bucket: 'public', limit: PUBLIC_REQUEST_LIMIT, atomic: false };
}

async function hashKey(key: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createD1RateLimitStore(database: D1Database | undefined): RateLimitStore {
  return {
    async consume({ key, limit, now, windowSeconds = RATE_LIMIT_WINDOW_SECONDS }) {
      if (!database) throw new Error('Rate limit database is unavailable');
      const row = await database.prepare(`
        INSERT INTO rate_limit_buckets (key, count, reset_at) VALUES (?, 1, ?)
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
          reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
        RETURNING count, reset_at
      `).bind(await hashKey(key), now + windowSeconds * 1000, now, now, now + windowSeconds * 1000)
        .first<{ count: number; reset_at: number }>();
      if (!row) throw new Error('Rate limit counter did not return a result');
      return {
        allowed: row.count <= limit,
        limit,
        remaining: Math.max(0, limit - row.count),
        retryAfterSeconds: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
      };
    },
  };
}

export function getClientIp(headers: Headers) {
  const connectingIp = headers.get('CF-Connecting-IP')?.trim();
  if (connectingIp) return connectingIp;

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
  store?: RateLimitStore,
) {
  if (context.req.path === '/health' || context.req.method === 'OPTIONS') {
    return null;
  }

  const policy = getRateLimitPolicy(context.req.path, context.req.method);
  const key = `${policy.bucket}:${getClientIp(context.req.raw.headers)}`;
  let result: RateLimitResult;
  if (policy.atomic) {
    try {
      result = await (store ?? createD1RateLimitStore(context.env?.DB)).consume({ key, limit: policy.limit, now });
    } catch {
      return context.json({ error: 'rate_limit_unavailable', message: '请求检查暂时不可用，请稍后重试。' }, 503, { 'Retry-After': '5' });
    }
  } else {
    result = await consumeRateLimit(cache, key, policy.limit, now);
  }

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
