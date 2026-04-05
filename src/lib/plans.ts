export const PLANS = {
  standard: {
    name: "Standard",
    price: 49,
    documentUploadLimit: 50,
    questionLimit: 1000,
    features: {
      customDomain: false,
      customBranding: false,
    },
    description: "Perfect for churches getting started with AI-powered chat",
    highlights: [
      "Subdomain on doctrinally.ai",
      "50 document uploads per month",
      "1,000 messages per month",
      "Doctrinally.AI branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    documentUploadLimit: 100,
    questionLimit: 2000,
    features: {
      customDomain: true,
      customBranding: true,
    },
    description: "For churches that want full control over their experience",
    highlights: [
      "Custom domain support",
      "100 document uploads per month",
      "2,000 messages per month",
      "Your own logo and branding",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Free trial configuration. Only Standard is trialable; Enterprise goes through sales.
export const TRIAL_DAYS = 14;
export const TRIAL_LIMITS = {
  documentUploadLimit: 10,
  questionLimit: 100,
} as const;

export function getPlanLimits(plan: PlanType) {
  return {
    documentUploadLimit: PLANS[plan].documentUploadLimit,
    questionLimit: PLANS[plan].questionLimit,
  };
}

// Source of truth for the limits stored on a subscription row.
// During a trial the church gets a capped taste of Standard; on conversion
// the Stripe webhook (trialing → active) bumps to full plan limits.
export function getInitialLimits(plan: PlanType, isTrial: boolean) {
  if (isTrial) return { ...TRIAL_LIMITS };
  return getPlanLimits(plan);
}

export function getOverageRates() {
  return {
    documentUpload: 0.25,
    question: 0.25,
  };
}

