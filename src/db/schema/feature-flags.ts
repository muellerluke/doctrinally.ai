import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { churches } from "./churches";
import { users } from "./users";

/**
 * Per-church feature-flag overrides.
 *
 * The source of truth for _which flags exist_ is the TypeScript
 * registry in `src/lib/feature-flags/flags.ts` — that keeps flag
 * definitions, defaults, and descriptions co-located with the code
 * that uses them, and avoids having two places to stay in sync for
 * flag metadata.
 *
 * This table only stores **overrides** for the per-flag default. A
 * church with no row for a given flag falls back to the registry
 * default. That keeps the table small (only non-default values live
 * here), makes "is this feature rolled out?" the same question as
 * "is there an override that says true?", and means removing a flag
 * from the registry doesn't orphan rows — they just become inert.
 *
 * Composite PK on `(church_id, flag_key)` so one church has exactly
 * one row per flag. Index on `flag_key` so the super-admin rollout
 * view ("show me every church where X is on") is a cheap index scan.
 */
export const churchFeatureFlags = pgTable(
  "church_feature_flags",
  {
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    flagKey: text("flag_key").notNull(),
    enabled: boolean("enabled").notNull(),
    // Audit — who flipped it last. Null on seed rows created by
    // migrations or system processes.
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.churchId, table.flagKey] }),
    index("church_feature_flags_flag_key_idx").on(table.flagKey),
  ]
);

export const churchFeatureFlagsRelations = relations(
  churchFeatureFlags,
  ({ one }) => ({
    church: one(churches, {
      fields: [churchFeatureFlags.churchId],
      references: [churches.id],
    }),
    updatedBy: one(users, {
      fields: [churchFeatureFlags.updatedByUserId],
      references: [users.id],
    }),
  })
);
