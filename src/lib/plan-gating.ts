import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";

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
