import { and, eq, gt } from 'drizzle-orm';
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

export type AuthStore = {
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
    expiresAt: number;
    tokenHash: string;
    userId: number;
  }) => Promise<void>;
  saveBangumiLogin: (input: {
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
    updatedAt: number;
    user: AuthUser;
  }) => Promise<void>;
};

export function createD1AuthStore(database: D1Database): AuthStore {
  const db = drizzle(database);

  return {
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
        ? {
            avatarUrl: user.avatarUrl ?? undefined,
            id: user.bangumiUserId,
            nickname: user.nickname,
            username: user.username,
          }
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
  };
}
