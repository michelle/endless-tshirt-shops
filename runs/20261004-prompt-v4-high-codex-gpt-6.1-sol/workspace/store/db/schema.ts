import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const orders=sqliteTable('orders',{
 id:text('id').primaryKey(),token:text('token').notNull(),design:text('design').notNull(),
 asset:text('asset').notNull(),session:text('session').unique(),amount:integer('amount').notNull(),
 status:text('status').notNull().default('pending'),prodigi:text('prodigi'),error:text('error'),
 recipient:text('recipient'),created:integer('created').notNull(),updated:integer('updated').notNull()
});
