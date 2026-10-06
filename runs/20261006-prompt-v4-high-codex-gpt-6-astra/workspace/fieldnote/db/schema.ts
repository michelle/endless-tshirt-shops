import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const orders = sqliteTable('orders', {
 id: text('id').primaryKey(), token: text('token').notNull(), design: text('design').notNull(),
 assetKey: text('asset_key').notNull(), sessionId: text('session_id').unique(),
 status: text('status').notNull().default('pending'), total: integer('total').notNull(),
 prodigiId: text('prodigi_id'), fulfillmentPayload: text('fulfillment_payload'),
 lastError: text('last_error'), createdAt: integer('created_at').notNull(), paidAt: integer('paid_at'),
});
export const limits = sqliteTable('rate_limits', { key: text('key').primaryKey(), count: integer('count').notNull() });
