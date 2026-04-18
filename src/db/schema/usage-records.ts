import {
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { churches } from "./churches";

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
    questions: integer("questions").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    // Total cents spent by the sermon-writer for this period. Reset each period
    // via the same period-scoped row as other usage counters.
    sermonTokensCents: integer("sermon_tokens_cents").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.churchId, table.periodStart)]
);
