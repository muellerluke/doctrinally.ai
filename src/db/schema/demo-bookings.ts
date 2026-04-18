import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const demoBookings = pgTable("demo_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  slotStart: timestamp("slot_start", { mode: "date" }).notNull().unique(),
  agreedToTermsAt: timestamp("agreed_to_terms_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
