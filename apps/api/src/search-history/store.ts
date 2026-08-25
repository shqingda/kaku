import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { userSearchHistory } from '../db/schema.ts';

export type StoredSearchHistory = {
  items: string[];
  updatedAt: number;
  userId: number;
};

export type SearchHistoryStore = {
  get: (userId: number) => Promise<StoredSearchHistory | null>;
  save: (input: StoredSearchHistory) => Promise<void>;
};

export function createD1SearchHistoryStore(
  database: D1Database,
): SearchHistoryStore {
  const db = drizzle(database);

  return {
    async get(userId) {
      const [row] = await db
        .select()
        .from(userSearchHistory)
        .where(eq(userSearchHistory.userId, userId))
        .limit(1);
      if (!row) return null;

      const parsed: unknown = JSON.parse(row.items);
      return {
        items: Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [],
        updatedAt: row.updatedAt,
        userId: row.userId,
      };
    },

    async save(input) {
      await db
        .insert(userSearchHistory)
        .values({
          items: JSON.stringify(input.items),
          updatedAt: input.updatedAt,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            items: JSON.stringify(input.items),
            updatedAt: input.updatedAt,
          },
          target: userSearchHistory.userId,
        });
    },
  };
}
