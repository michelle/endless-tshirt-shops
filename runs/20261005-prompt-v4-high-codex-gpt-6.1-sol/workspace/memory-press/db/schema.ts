import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const orders = sqliteTable('orders', {
 id: text('id').primaryKey(), tokenHash: text('token_hash').notNull(), design: text('design').notNull(),
 assetKey: text('asset_key').notNull(), state: text('state').notNull().default('pending'),
 mode: text('mode').notNull(), sessionId: text('session_id').unique(), recipient: text('recipient'),
 prodigiId: text('prodigi_id'), error: text('error'), amount: integer('amount').notNull(),
 created: integer('created').notNull(), updated: integer('updated').notNull(),
}, (t) => [index('orders_state_idx').on(t.state, t.updated)]);
export const rateLimits = sqliteTable('rate_limits', {
 key: text('key').primaryKey(), count: integer('count').notNull(), expires: integer('expires').notNull(),
});
