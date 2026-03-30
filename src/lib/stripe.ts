import Stripe from "stripe";
import { env } from "@/lib/env";
import type { PlanType } from "@/lib/plans";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

export function getStripePriceId(plan: PlanType): string {
  return plan === "standard"
    ? env.STRIPE_STANDARD_PRICE_ID
    : env.STRIPE_ENTERPRISE_PRICE_ID;
}
