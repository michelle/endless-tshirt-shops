import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), token: text('token').notNull(),
  design: text('design').notNull(), size: text('size').notNull(),
  status: text('status').notNull().default('awaiting_payment'),
  amount: integer('amount').notNull(), currency: text('currency').notNull().default('usd'),
  sessionId: text('session_id'), assetKey: text('asset_key').notNull(),
  assetToken: text('asset_token').notNull(), prodigiId: text('prodigi_id'),
  error: text('error'), leaseUntil: integer('lease_until').notNull().default(0),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (t) => [uniqueIndex('orders_session_idx').on(t.sessionId), index('orders_status_idx').on(t.status)]);
