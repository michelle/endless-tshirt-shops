import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), stripeSessionId: text("stripe_session_id").unique(),
  place: text("place").notNull(), date: text("date").notNull(), note: text("note").notNull(), size: text("size").notNull(),
  status: text("status").notNull(), prodigiOrderId: text("prodigi_order_id"), error: text("error"), createdAt: text("created_at").notNull(),
});
