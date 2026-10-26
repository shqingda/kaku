import { and, desc, eq, exists, gt, isNotNull, isNull, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import {
  authHandoffs,
  bangumiCredentials,
  oauthTransactions,
  pushDevices,
  sessions,
  users,
} from '../db/schema.ts';

export type AuthUser = {
  avatarUrl?: string;
  id: number;
  nickname: string;
  username: string;
};

export type AuthenticatedSession = {
  connectionId: string | null;
  sessionId: string;
  user: AuthUser;
  userId: number;
};

type AuthSessionSummary = {
  createdAt: number;
  deviceName: string;
  expiresAt: number;
  lastUsedAt: number;
  sessionId: string;
};

type StoredBangumiCredential = {
  connectionId: string;
  refreshOperationId: string | null;
  refreshLeaseExpiresAt: number | null;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  updatedAt: number;
  userId: number;
};

type CreateSessionInput = {
  createdAt: number;
  deviceName: string;
  expiresAt: number;
  refreshExpiresAt: number;
  refreshTokenHash: string;
  sessionId: string;
  tokenHash: string;
  userId: number;
};

export type AuthStore = {
  claimBangumiRefresh: (input: {
    userId: number; connectionId: string; refreshToken: string;
    operationId: string; now: number; leaseExpiresAt: number;
  }) => Promise<boolean>;
  releaseBangumiRefresh: (userId: number, connectionId: string, operationId: string) => Promise<void>;
  authenticateSession: (
    tokenHash: string,
    now: number,
  ) => Promise<AuthenticatedSession | null>;
  consumeHandoff: (
    codeHash: string,
    now: number,
    binding: { codeChallenge: string; requestId: string },
  ) => Promise<{ connectionId: string; user: AuthUser } | null>;
  consumeOAuthTransaction: (
    stateHash: string,
    now: number,
  ) => Promise<{ appRedirectUri: string; codeChallenge: string; requestId: string } | null>;
  createHandoff: (input: {
    codeHash: string;
    codeChallenge: string;
    connectionId: string;
    requestId: string;
    createdAt: number;
    expiresAt: number;
    userId: number;
  }) => Promise<void>;
  createOAuthTransaction: (input: {
    appRedirectUri: string;
    codeChallenge: string;
    requestId: string;
    createdAt: number;
    expiresAt: number;
    stateHash: string;
  }) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<void>;
  createSessionForConnection: (input: CreateSessionInput & { connectionId: string }) => Promise<boolean>;
  deleteAllSessions: (userId: number) => Promise<void>;
  deleteBangumiCredential: (userId: number, expectedConnectionId: string | null) => Promise<boolean>;
  deleteOtherSessions: (
    userId: number,
    currentSessionId: string,
  ) => Promise<number>;
  deleteSession: (tokenHash: string) => Promise<void>;
  deleteSessionById: (userId: number, sessionId: string) => Promise<boolean>;
  getBangumiCredential: (
    userId: number,
  ) => Promise<StoredBangumiCredential | null>;
  getSessionForRefresh: (
    refreshTokenHash: string,
    now: number,
  ) => Promise<{ sessionId: string; user: AuthUser; userId: number } | null>;
  listSessions: (userId: number, now: number) => Promise<AuthSessionSummary[]>;
  rotateSession: (input: {
    expiresAt: number;
    lastUsedAt: number;
    previousRefreshTokenHash: string;
    refreshExpiresAt: number;
    refreshTokenHash: string;
    sessionId: string;
    tokenHash: string;
  }) => Promise<boolean>;
  saveBangumiLogin: (input: {
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
    updatedAt: number;
    user: AuthUser;
  }) => Promise<string>;
  saveBangumiCredential: (input: {
    accessToken: string; accessTokenExpiresAt: number; refreshToken: string;
    updatedAt: number; userId: number; connectionId: string;
    previousRefreshToken: string; operationId: string;
  }) => Promise<boolean>;
};

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    avatarUrl: user.avatarUrl ?? undefined,
    id: user.bangumiUserId,
    nickname: user.nickname,
    username: user.username,
  };
}

export function createD1AuthStore(database: D1Database): AuthStore {
  const db = drizzle(database);

  return {
    async claimBangumiRefresh(input) {
      const claimed = await db.update(bangumiCredentials).set({
        refreshOperationId: input.operationId,
        refreshLeaseExpiresAt: input.leaseExpiresAt,
      }).where(and(
        eq(bangumiCredentials.userId, input.userId),
        eq(bangumiCredentials.connectionId, input.connectionId),
        eq(bangumiCredentials.refreshToken, input.refreshToken),
        isNull(bangumiCredentials.refreshOperationId),
      )).returning({ userId: bangumiCredentials.userId });
      return claimed.length > 0;
    },

    async releaseBangumiRefresh(userId, connectionId, operationId) {
      await db.update(bangumiCredentials).set({ refreshOperationId: null, refreshLeaseExpiresAt: null })
        .where(and(eq(bangumiCredentials.userId, userId), eq(bangumiCredentials.connectionId, connectionId), eq(bangumiCredentials.refreshOperationId, operationId)));
    },
    async authenticateSession(tokenHash, now) {
      const [row] = await db
        .select({ session: sessions, user: users, connectionId: bangumiCredentials.connectionId })
        .from(sessions)
        .innerJoin(users, eq(users.bangumiUserId, sessions.userId))
        .leftJoin(bangumiCredentials, eq(bangumiCredentials.userId, sessions.userId))
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
        .limit(1);

      if (!row) {
        return null;
      }

      await db
        .update(sessions)
        .set({ lastUsedAt: now })
        .where(eq(sessions.sessionId, row.session.sessionId));

      return {
        connectionId: row.connectionId,
        sessionId: row.session.sessionId,
        user: toAuthUser(row.user),
        userId: row.user.bangumiUserId,
      };
    },
    async consumeHandoff(codeHash, now, binding) {
      const [handoff] = await db
        .delete(authHandoffs)
        .where(
          and(
            eq(authHandoffs.codeHash, codeHash),
            gt(authHandoffs.expiresAt, now),
            eq(authHandoffs.codeChallenge, binding.codeChallenge),
            eq(authHandoffs.requestId, binding.requestId),
            exists(db.select({ userId: bangumiCredentials.userId }).from(bangumiCredentials).where(and(
              eq(bangumiCredentials.userId, authHandoffs.userId),
              eq(bangumiCredentials.connectionId, authHandoffs.connectionId),
            ))),
          ),
        )
        .returning({ userId: authHandoffs.userId, connectionId: authHandoffs.connectionId });

      if (!handoff?.connectionId) {
        return null;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.bangumiUserId, handoff.userId))
        .limit(1);

      return user
        ? { connectionId: handoff.connectionId, user: toAuthUser(user) }
        : null;
    },

    async consumeOAuthTransaction(stateHash, now) {
      const [transaction] = await db
        .delete(oauthTransactions)
        .where(
          and(
            eq(oauthTransactions.stateHash, stateHash),
            gt(oauthTransactions.expiresAt, now),
            isNotNull(oauthTransactions.codeChallenge),
            isNotNull(oauthTransactions.requestId),
          ),
        )
        .returning({
          appRedirectUri: oauthTransactions.appRedirectUri,
          codeChallenge: oauthTransactions.codeChallenge,
          requestId: oauthTransactions.requestId,
        });

      return transaction?.codeChallenge && transaction.requestId ? {
        appRedirectUri: transaction.appRedirectUri,
        codeChallenge: transaction.codeChallenge,
        requestId: transaction.requestId,
      } : null;
    },

    async createHandoff(input) {
      await db.insert(authHandoffs).values(input);
    },

    async createOAuthTransaction(input) {
      await db.insert(oauthTransactions).values(input);
    },

    async createSession(input) {
      await db.insert(sessions).values({
        ...input,
        lastUsedAt: input.createdAt,
      });
    },

    async createSessionForConnection(input) {
      // Consumption and issuance are separate requests to D1. Recheck the
      // original connection in this write so a late issuance cannot outlive it.
      const result = await database.prepare(`
        INSERT INTO sessions (created_at, device_name, expires_at, last_used_at,
          refresh_expires_at, refresh_token_hash, session_id, token_hash, user_id)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, user_id FROM bangumi_credentials
        WHERE user_id = ? AND connection_id = ?
        RETURNING session_id
      `).bind(input.createdAt, input.deviceName, input.expiresAt, input.createdAt,
        input.refreshExpiresAt, input.refreshTokenHash, input.sessionId,
        input.tokenHash, input.userId, input.connectionId).all();
      return result.results.length > 0;
    },

    async deleteAllSessions(userId) {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    },

    async deleteOtherSessions(userId, currentSessionId) {
      const deleted = await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            ne(sessions.sessionId, currentSessionId),
          ),
        )
        .returning({ sessionId: sessions.sessionId });

      return deleted.length;
    },

    async deleteBangumiCredential(userId, expectedConnectionId) {
      if (!expectedConnectionId) return false;
      const currentConnection = exists(
        db.select({ userId: bangumiCredentials.userId }).from(bangumiCredentials).where(and(
          eq(bangumiCredentials.userId, userId), eq(bangumiCredentials.connectionId, expectedConnectionId),
        )),
      );
      const results = await db.batch([
        db.delete(sessions).where(and(eq(sessions.userId, userId), currentConnection)),
        db.delete(pushDevices).where(and(eq(pushDevices.userId, userId), currentConnection)),
        db.delete(authHandoffs).where(and(eq(authHandoffs.userId, userId), currentConnection)),
        db.delete(bangumiCredentials).where(and(eq(bangumiCredentials.userId, userId), currentConnection))
          .returning({ userId: bangumiCredentials.userId }),
      ]);
      return results[3].length > 0;
    },

    async deleteSession(tokenHash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },

    async deleteSessionById(userId, sessionId) {
      const deleted = await db
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.sessionId, sessionId)))
        .returning({ sessionId: sessions.sessionId });

      return deleted.length > 0;
    },

    async getBangumiCredential(userId) {
      const [credential] = await db
        .select()
        .from(bangumiCredentials)
        .where(eq(bangumiCredentials.userId, userId))
        .limit(1);

      return credential ?? null;
    },

    async getSessionForRefresh(refreshTokenHash, now) {
      const [row] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.bangumiUserId, sessions.userId))
        .where(
          and(
            eq(sessions.refreshTokenHash, refreshTokenHash),
            gt(sessions.refreshExpiresAt, now),
          ),
        )
        .limit(1);

      return row
        ? {
            sessionId: row.session.sessionId,
            user: toAuthUser(row.user),
            userId: row.user.bangumiUserId,
          }
        : null;
    },

    async listSessions(userId, now) {
      return db
        .select({
          createdAt: sessions.createdAt,
          deviceName: sessions.deviceName,
          expiresAt: sessions.refreshExpiresAt,
          lastUsedAt: sessions.lastUsedAt,
          sessionId: sessions.sessionId,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            gt(sessions.refreshExpiresAt, now),
          ),
        )
        .orderBy(desc(sessions.lastUsedAt));
    },

    async rotateSession(input) {
      const rotated = await db
        .update(sessions)
        .set({
          expiresAt: input.expiresAt,
          lastUsedAt: input.lastUsedAt,
          refreshExpiresAt: input.refreshExpiresAt,
          refreshTokenHash: input.refreshTokenHash,
          tokenHash: input.tokenHash,
        })
        .where(
          and(
            eq(sessions.sessionId, input.sessionId),
            eq(sessions.refreshTokenHash, input.previousRefreshTokenHash),
          ),
        )
        .returning({ sessionId: sessions.sessionId });

      return rotated.length > 0;
    },

    async saveBangumiLogin(input) {
      const connectionId = crypto.randomUUID();
      await db.batch([db
        .insert(users)
        .values({
          avatarUrl: input.user.avatarUrl,
          bangumiUserId: input.user.id,
          createdAt: input.updatedAt,
          nickname: input.user.nickname,
          updatedAt: input.updatedAt,
          username: input.user.username,
        })
        .onConflictDoUpdate({
          set: {
            avatarUrl: input.user.avatarUrl,
            nickname: input.user.nickname,
            updatedAt: input.updatedAt,
            username: input.user.username,
          },
          target: users.bangumiUserId,
        }),

      db
        .insert(bangumiCredentials)
        .values({
          connectionId,
          accessToken: input.accessToken,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          refreshToken: input.refreshToken,
          updatedAt: input.updatedAt,
          userId: input.user.id,
        })
        .onConflictDoUpdate({
          set: {
            connectionId,
            refreshOperationId: null,
            refreshLeaseExpiresAt: null,
            accessToken: input.accessToken,
            accessTokenExpiresAt: input.accessTokenExpiresAt,
            refreshToken: input.refreshToken,
            updatedAt: input.updatedAt,
          },
          target: bangumiCredentials.userId,
        })]);
      return connectionId;
    },

    async saveBangumiCredential(input) {
      const saved = await db.update(bangumiCredentials).set({
        accessToken: input.accessToken,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        refreshToken: input.refreshToken,
        updatedAt: input.updatedAt,
        refreshOperationId: null,
        refreshLeaseExpiresAt: null,
      }).where(and(
        eq(bangumiCredentials.userId, input.userId),
        eq(bangumiCredentials.connectionId, input.connectionId),
        eq(bangumiCredentials.refreshToken, input.previousRefreshToken),
        eq(bangumiCredentials.refreshOperationId, input.operationId),
      )).returning({ userId: bangumiCredentials.userId });
      return saved.length > 0;
    },
  };
}
