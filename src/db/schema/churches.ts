import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

  // Proactive outreach — widget reaches out after the visitor pauses
  // while reading, asks a page-aware opener, and gives the church a
  // shot at capturing the lead. When `embedAiOpenerEnabled` is false
  // (default) the opener is picked from the templates below; when true
  // `mercury-2` generates a personalized line (falling back to a
  // template if the model doesn't answer within ~1.5s).
  embedProactiveOutreachEnabled: boolean("embed_proactive_outreach_enabled")
    .notNull()
    .default(true),
  embedAiOpenerEnabled: boolean("embed_ai_opener_enabled")
    .notNull()
    .default(false),
  // Small set of opener templates seeded at signup. `{topic}` is
  // substituted with a short phrase extracted from the page headings
  // the visitor was looking at. Stored as JSON so admins can edit the
  // list without a schema change.
  embedOpenerTemplates: jsonb("embed_opener_templates")
    .$type<string[]>()
    .notNull()
    .default([
      "I noticed you're reading about {topic}. Happy to answer any questions — what's on your mind?",
      "Welcome! Anything I can help clarify about {topic}?",
      "Looking into {topic}? I can pull answers from our sermons and teaching — just ask.",
      "Hi there — quick question about {topic}, or something else on your mind?",
      "Glad you stopped by. Want me to dig into {topic} with you?",
    ]),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
