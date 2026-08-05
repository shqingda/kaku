import type { Context } from 'hono';

import type { Env } from '../env.ts';
import { hashToken } from './crypto.ts';
import type {
  AuthenticatedSession,
  AuthStore,
} from './store.ts';

export type SessionAuthentication = AuthenticatedSession & {
  tokenHash: string;
};

export async function authenticateRequest(
  context: Context<{ Bindings: Env }>,
  store: AuthStore,
  now: number,
): Promise<SessionAuthentication | Response> {
  const authorization = context.req.header('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return context.json(
      { error: 'unauthorized', message: '请先登录 Kaku。' },
      401,
    );
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (token.length < 20) {
    return context.json(
      { error: 'invalid_session', message: '登录凭证格式不正确。' },
      401,
    );
  }

  const tokenHash = await hashToken(token);
  const session = await store.authenticateSession(tokenHash, now);

  if (!session) {
    return context.json(
      { error: 'session_expired', message: '登录已过期，请刷新或重新登录。' },
      401,
    );
  }

  return { ...session, tokenHash };
}

export function isAuthenticationResponse(
  value: SessionAuthentication | Response,
): value is Response {
  return value instanceof Response;
}
