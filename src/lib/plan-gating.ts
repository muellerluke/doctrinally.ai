import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";
import { isFeatureEnabled } from "@/lib/feature-flags";

type Feature = "customDomain" | "customBranding" | "youtubeSync";

export function isFeatureAvailable(plan: PlanType, feature: Feature): boolean {
  return PLANS[plan].features[feature];
}

export function canUseCustomDomain(plan: string): boolean {
  return plan === "enterprise";
}

export function canUseCustomBranding(plan: string): boolean {
  return plan === "enterprise";
}

export function canUseYouTubeSync(plan: string): boolean {
  return plan === "enterprise";
}

/**
 * Plan-only gate for the embedded chat widget. Stays plan-only so
 * the name matches the behavior — use `isEmbeddedChatAvailable`
 * below to get the combined plan + feature-flag check.
 */
export function canUseEmbedWidget(plan: string): boolean {
  return plan === "enterprise";
}

/**
 * Combined gate: widget is exposed to a church only when their plan
 * allows it AND the `embedded_chat` feature flag is enabled for them.
 *
 * The two gates are complementary: plan-gating answers "is this in
 * your subscription?" and the flag answers "have we rolled it out to
 * you?" A Standard church with the flag on still can't use the
 * widget (plan gate still blocks); an Enterprise church with the
 * flag off is hidden from the widget entirely.
 *
 * Async because it reads the flag (cached in memory). Call once per
 * render/request and pass the boolean down rather than calling
 * repeatedly.
 */
export async function isEmbeddedChatAvailable(
  churchId: string,
  plan: string | null | undefined
): Promise<boolean> {
  if (!plan || !canUseEmbedWidget(plan)) return false;
  return isFeatureEnabled(churchId, "embedded_chat");
}
