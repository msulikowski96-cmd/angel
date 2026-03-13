import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guardiansTable = pgTable("guardians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  relationship: text("relationship"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardianSchema = createInsertSchema(guardiansTable).omit({ id: true, createdAt: true });
export type InsertGuardian = z.infer<typeof insertGuardianSchema>;
export type Guardian = typeof guardiansTable.$inferSelect;
