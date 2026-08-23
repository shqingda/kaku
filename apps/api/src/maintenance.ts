import { lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { authHandoffs, oauthTransactions, sessions } from './db/schema.ts';

export type CleanupResult = {
  deletedAuthHandoffs: number;
  deletedOAuthTransactions: number;
  deletedSessions: number;
};

// 只清理已经过期的 OAuth 状态、一次性 handoff 和 refresh token 已过期的 session。
// 不会删除仍在有效期内的 Kaku 登录会话，因此不会导致用户每天重新登录。
export async function cleanupExpiredAuthData(
  database: D1Database,
  now: number,
): Promise<CleanupResult> {
  const db = drizzle(database);

  const [deletedAuthHandoffs, deletedOAuthTransactions, deletedSessions] =
    await Promise.all([
      db
        .delete(authHandoffs)
        .where(lt(authHandoffs.expiresAt, now))
        .returning({ codeHash: authHandoffs.codeHash }),
      db
        .delete(oauthTransactions)
        .where(lt(oauthTransactions.expiresAt, now))
        .returning({ stateHash: oauthTransactions.stateHash }),
      db
        .delete(sessions)
        .where(lt(sessions.refreshExpiresAt, now))
        .returning({ sessionId: sessions.sessionId }),
    ]);

  return {
    deletedAuthHandoffs: deletedAuthHandoffs.length,
    deletedOAuthTransactions: deletedOAuthTransactions.length,
    deletedSessions: deletedSessions.length,
  };
}
