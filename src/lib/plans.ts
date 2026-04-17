export const PLANS = {
  standard: {
    name: "Standard",
    price: 49,
    questionLimit: 1500,
    features: {
      customDomain: false,
      customBranding: false,
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
    },
    description: "For churches that want full control over their experience",
    highlights: [
      "Custom domain support",
      "Unlimited document uploads",
      "3,000 messages per month",
      "Your own logo and branding",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Free trial configuration. Both plans include a 14-day free trial with
// full plan limits — trials give the complete experience of the selected plan.
export const TRIAL_DAYS = 14;

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

