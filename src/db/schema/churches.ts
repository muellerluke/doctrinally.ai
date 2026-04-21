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
  // Public church website used to bootstrap branding at signup and to seed
  // the monthly content crawl. Stored as the user typed it (with or without
  // protocol); normalized to a full URL by the Firecrawl wrapper before use.
  websiteDomain: text("website_domain"),
  isActive: boolean("is_active").notNull().default(false),

  // Branding — single theme. Member-facing chat renders in the church's
  // configured colors regardless of the viewer's OS light/dark preference.
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),

  // Additional branding
  faviconUrl: text("favicon_url"),
  welcomeMessage: text("welcome_message"),
  logoHeight: text("logo_height"),
  fontFamily: text("font_family"),

  // AI behavior
  aiFallbackInstruction: text("ai_fallback_instruction"),

  // Embeddable chat widget — Enterprise only. `embedPublicKey` is a public
  // identifier that the church pastes into its site in a `<script>` tag;
  // it's visible to every visitor, so it's not a secret — it's just the
  // lookup key. Rotatable by regenerating from settings.
  embedPublicKey: text("embed_public_key").unique(),
  embedEnabled: boolean("embed_enabled").notNull().default(false),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
