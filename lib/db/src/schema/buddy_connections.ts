import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buddyConnectionsTable = pgTable("buddy_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sponsorId: integer("sponsor_id"),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBuddyConnectionSchema = createInsertSchema(buddyConnectionsTable).omit({ id: true, createdAt: true });
export type InsertBuddyConnection = z.infer<typeof insertBuddyConnectionSchema>;
export type BuddyConnection = typeof buddyConnectionsTable.$inferSelect;
