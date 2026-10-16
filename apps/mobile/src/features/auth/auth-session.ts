import { authSessionSchema } from '@kaku/shared/auth-contract';
export { authSessionSchema } from '@kaku/shared/auth-contract';

import type { AuthSession } from './model';

export function isSessionActive(expiresAt: number, now = Date.now()) {
  return expiresAt > now;
}

export function canRefreshSession(refreshExpiresAt: number, now = Date.now()) {
  return refreshExpiresAt > now;
}

export function parseStoredAuthSession(value: string): AuthSession | null {
  try {
    const parsed = authSessionSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
