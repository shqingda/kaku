import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  avatarUrl: text('avatar_url'),
  bangumiUserId: integer('bangumi_user_id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  nickname: text('nickname').notNull(),
  updatedAt: integer('updated_at').notNull(),
  username: text('username').notNull().unique(),
});

export const oauthTransactions = sqliteTable('oauth_transactions', {
  appRedirectUri: text('app_redirect_uri').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  stateHash: text('state_hash').primaryKey(),
});

export const bangumiCredentials = sqliteTable('bangumi_credentials', {
  accessToken: text('access_token').notNull(),
  accessTokenExpiresAt: integer('access_token_expires_at').notNull(),
  refreshToken: text('refresh_token').notNull(),
  updatedAt: integer('updated_at').notNull(),
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});

export const authHandoffs = sqliteTable('auth_handoffs', {
  codeHash: text('code_hash').primaryKey(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});

export const sessions = sqliteTable('sessions', {
  sessionId: text('session_id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  deviceName: text('device_name').notNull(),
  expiresAt: integer('expires_at').notNull(),
  lastUsedAt: integer('last_used_at').notNull(),
  refreshExpiresAt: integer('refresh_expires_at').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});

export const userPreferences = sqliteTable('user_preferences', {
  locale: text('locale').notNull().default('system'),
  theme: text('theme').notNull().default('system'),
  updatedAt: integer('updated_at').notNull(),
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});

export const userSearchHistory = sqliteTable('user_search_history', {
  items: text('items').notNull().default('[]'),
  updatedAt: integer('updated_at').notNull(),
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});

export const userRecentSubjects = sqliteTable('user_recent_subjects', {
  items: text('items').notNull().default('[]'),
  updatedAt: integer('updated_at').notNull(),
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.bangumiUserId, { onDelete: 'cascade' }),
});
