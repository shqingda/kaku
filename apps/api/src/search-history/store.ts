import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { userSearchHistory } from '../db/schema.ts';

type StoredSearchHistory = {
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

      let parsed: unknown;
      try {
        parsed = JSON.parse(row.items);
      } catch {
        // JSON errors may contain search terms; log only a controlled error.
        throw new Error('search_history_parse_failed');
      }
      if (!Array.isArray(parsed)
        || !parsed.every((item): item is string => typeof item === 'string')) {
        throw new Error('search_history_parse_failed');
      }
      return {
        items: parsed,
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
