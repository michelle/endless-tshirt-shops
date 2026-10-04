import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
  status: text("status").notNull(),
  place: text("place").notNull(),
  momentDate: text("moment_date").notNull(),
  dedication: text("dedication").notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  stripeSession: text("stripe_session"),
  processingAt: integer("processing_at"),
  prodigiId: text("prodigi_id"),
  failure: text("failure"),
});
