export const PLANS = {
  standard: {
    name: "Standard",
    price: 49,
    questionLimit: 1500,
    features: {
      customDomain: false,
      customBranding: false,
      sermonWriter: false,
      youtubeSync: false,
    },
    description: "Perfect for churches getting started with AI-powered chat",
    highlights: [
      "Subdomain on doctrinally.ai",
      "Unlimited document uploads",
      "1,500 messages per month",
      "Doctrinally.AI branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    questionLimit: 3000,
    features: {
      customDomain: true,
      customBranding: true,
      sermonWriter: true,
      youtubeSync: true,
    },
    description: "For churches that want full control over their experience",
    highlights: [
      "Custom domain support",
      "Unlimited document uploads",
      "3,000 messages per month",
      "Your own logo and branding",
      "AI-assisted sermon writer ($10/mo AI budget)",
      "Auto-sync your entire YouTube channel every week",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Free trial configuration. Both plans include a 14-day free trial with
// full plan limits — trials give the complete experience of the selected plan.
export const TRIAL_DAYS = 14;

// Default sermon-writer budget for Enterprise churches, in cents.
// Subscription rows hold the authoritative per-church value; this is the
// seed value used when a fresh Enterprise subscription is created.
export const DEFAULT_SERMON_BUDGET_CENTS = 1000;

export function getPlanLimits(plan: PlanType) {
  return {
    questionLimit: PLANS[plan].questionLimit,
  };
}

export function getOverageRates() {
  return {
    question: 0.25,
  };
}

/**
 * Whether a plan has access to the sermon-writer feature. Enterprise only.
 * Used for UI gating and `/api/sermons/chat` route-entry checks.
 */
export function hasSermonWriter(plan: PlanType | undefined | null): boolean {
  if (!plan) return false;
  return PLANS[plan].features.sermonWriter === true;
}

/**
 * Whether a plan can auto-sync an entire YouTube channel into the library.
 * Enterprise only.
 */
export function hasYouTubeSync(plan: PlanType | undefined | null): boolean {
  if (!plan) return false;
  return PLANS[plan].features.youtubeSync === true;
}
