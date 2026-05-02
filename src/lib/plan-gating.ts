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
 * Plan-only gate for the Website Chat widget. Website Chat is
 * included on every plan, so this always returns true today. The
 * function is preserved (not deleted) so the call sites keep their
 * shape and we have a single place to re-introduce a plan gate later
 * if the product strategy changes.
 */
export function canUseEmbedWidget(_plan: string): boolean {
  return true;
}

/**
 * Combined gate: Website Chat is exposed to a church only when their
 * plan allows it AND the `embedded_chat` feature flag is enabled for
 * them. The plan check is currently a no-op (every plan includes the
 * widget); the flag is the per-church kill switch a super-admin can
 * toggle to disable a misbehaving church without a deploy.
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
