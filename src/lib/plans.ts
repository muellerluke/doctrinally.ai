export const PLANS = {
  standard: {
    name: "Standard",
    price: 49,
    documentUploadLimit: 25,
    questionLimit: 500,
    features: {
      customDomain: false,
      customBranding: false,
    },
    description: "Perfect for churches getting started with AI-powered chat",
    highlights: [
      "Subdomain on doctrinally.ai",
      "25 document uploads per month",
      "500 messages per month",
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

export function getPlanLimits(plan: PlanType) {
  return {
    documentUploadLimit: PLANS[plan].documentUploadLimit,
    questionLimit: PLANS[plan].questionLimit,
  };
}

export function getOverageRates() {
  return {
    documentUpload: 0.25,
    question: 0.25,
  };
}

