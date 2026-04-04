import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { churches } from "./churches";
import { users } from "./users";

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  churchId: uuid("church_id")
    .notNull()
    .references(() => churches.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title"),
  isAdminTest: boolean("is_admin_test").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
