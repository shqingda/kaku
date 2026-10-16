import { createApp } from '../../src/app.ts';

// Route-isolation tests explicitly inject a counter; rate-limit integration
// tests import the real app and use migrated D1 instead.
export function createTestApp(dependencies = {}) {
  const records = new Map();
  return createApp({
    rateLimitStore: {
      async consume({ key, limit, now, windowSeconds = 60 }) {
        const existing = records.get(key);
        const record = existing?.resetAt > now ? existing : { count: 0, resetAt: now + windowSeconds * 1000 };
        record.count++;
        records.set(key, record);
        return { allowed: record.count <= limit, limit, remaining: Math.max(0, limit - record.count), retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)) };
      },
    },
    ...dependencies,
  });
}
