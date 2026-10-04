import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const orders = sqliteTable('orders', {
 id: text('id').primaryKey(), token: text('token').notNull(), design: text('design').notNull(),
 size: text('size').notNull(), amount: integer('amount').notNull(), currency: text('currency').notNull(),
 status: text('status').notNull().default('pending'), sessionId: text('session_id').unique(),
 recipient: text('recipient'), prodigiId: text('prodigi_id'), error: text('error'),
 createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull()
});
