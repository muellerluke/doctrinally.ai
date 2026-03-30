import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const churches = pgTable("churches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  customDomain: text("custom_domain").unique(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
