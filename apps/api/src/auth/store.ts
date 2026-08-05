import { and, desc, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import {
  authHandoffs,
  bangumiCredentials,
  oauthTransactions,
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
  sessionId: string;
  user: AuthUser;
  userId: number;
};

export type AuthSessionSummary = {
  createdAt: number;
  deviceName: string;
  expiresAt: number;
  lastUsedAt: number;
  sessionId: string;
};

export type StoredBangumiCredential = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  updatedAt: number;
  userId: number;
};

export type AuthStore = {
  authenticateSession: (
    tokenHash: string,
    now: number,
  ) => Promise<AuthenticatedSession | null>;
  consumeHandoff: (codeHash: string, now: number) => Promise<AuthUser | null>;
  consumeOAuthTransaction: (
    stateHash: string,
    now: number,
  ) => Promise<{ appRedirectUri: string } | null>;
  createHandoff: (input: {
    codeHash: string;
    createdAt: number;
    expiresAt: number;
    userId: number;
  }) => Promise<void>;
  createOAuthTransaction: (input: {
    appRedirectUri: string;
    createdAt: number;
    expiresAt: number;
    stateHash: string;
  }) => Promise<void>;
  createSession: (input: {
    createdAt: number;
    deviceName: string;
    expiresAt: number;
    refreshExpiresAt: number;
    refreshTokenHash: string;
    sessionId: string;
    tokenHash: string;
    userId: number;
  }) => Promise<void>;
  deleteAllSessions: (userId: number) => Promise<void>;
  deleteBangumiCredential: (userId: number) => Promise<void>;
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
  }) => Promise<void>;
  saveBangumiCredential: (input: StoredBangumiCredential) => Promise<void>;
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
    async authenticateSession(tokenHash, now) {
      const [row] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.bangumiUserId, sessions.userId))
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
        sessionId: row.session.sessionId,
        user: toAuthUser(row.user),
        userId: row.user.bangumiUserId,
      };
    },
    async consumeHandoff(codeHash, now) {
      const [handoff] = await db
        .delete(authHandoffs)
        .where(
          and(
            eq(authHandoffs.codeHash, codeHash),
            gt(authHandoffs.expiresAt, now),
          ),
        )
        .returning({ userId: authHandoffs.userId });

      if (!handoff) {
        return null;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.bangumiUserId, handoff.userId))
        .limit(1);

      return user
        ? toAuthUser(user)
        : null;
    },

    async consumeOAuthTransaction(stateHash, now) {
      const [transaction] = await db
        .delete(oauthTransactions)
        .where(
          and(
            eq(oauthTransactions.stateHash, stateHash),
            gt(oauthTransactions.expiresAt, now),
          ),
        )
        .returning({ appRedirectUri: oauthTransactions.appRedirectUri });

      return transaction ?? null;
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

    async deleteAllSessions(userId) {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    },

    async deleteBangumiCredential(userId) {
      await db
        .delete(bangumiCredentials)
        .where(eq(bangumiCredentials.userId, userId));
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
      await db
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
        });

      await db
        .insert(bangumiCredentials)
        .values({
          accessToken: input.accessToken,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          refreshToken: input.refreshToken,
          updatedAt: input.updatedAt,
          userId: input.user.id,
        })
        .onConflictDoUpdate({
          set: {
            accessToken: input.accessToken,
            accessTokenExpiresAt: input.accessTokenExpiresAt,
            refreshToken: input.refreshToken,
            updatedAt: input.updatedAt,
          },
          target: bangumiCredentials.userId,
        });
    },

    async saveBangumiCredential(input) {
      await db
        .insert(bangumiCredentials)
        .values(input)
        .onConflictDoUpdate({
          set: {
            accessToken: input.accessToken,
            accessTokenExpiresAt: input.accessTokenExpiresAt,
            refreshToken: input.refreshToken,
            updatedAt: input.updatedAt,
          },
          target: bangumiCredentials.userId,
        });
    },
  };
}
