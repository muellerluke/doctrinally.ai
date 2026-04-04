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

  // Branding — light mode
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),

  // Branding — dark mode
  darkPrimaryColor: text("dark_primary_color"),
  darkAccentColor: text("dark_accent_color"),
  darkBackgroundColor: text("dark_background_color"),
  darkTextColor: text("dark_text_color"),
  darkLogoUrl: text("dark_logo_url"),

  // Additional branding
  faviconUrl: text("favicon_url"),
  welcomeMessage: text("welcome_message"),
  logoHeight: text("logo_height"),
  fontFamily: text("font_family"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
