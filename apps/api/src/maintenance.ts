import { lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { authHandoffs, oauthTransactions, sessions } from './db/schema.ts';

export type CleanupResult = {
  deletedAuthHandoffs: number;
  deletedOAuthTransactions: number;
  deletedSessions: number;
};

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
