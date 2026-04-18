import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { churches } from "./churches";

export const planEnum = pgEnum("plan", ["standard", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  churchId: uuid("church_id")
    .notNull()
    .unique()
    .references(() => churches.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  plan: planEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  questionLimit: integer("question_limit").notNull(),
  messageOverageEnabled: boolean("message_overage_enabled").notNull().default(false),
  messageOverageCap: integer("message_overage_cap").notNull().default(0),
  // Monthly budget in cents for the Enterprise sermon-writer. Default $10.
  // Enforcement reads this column; when a church is on Standard the feature is
  // gated by plan and this value is not consulted.
  sermonBudgetCents: integer("sermon_budget_cents").notNull().default(1000),
  currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
