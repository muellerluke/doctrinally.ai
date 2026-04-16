export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = {
  standard: {
    name: "Standard",
    priceMonthly: 4900,
    questionLimit: 1000,
    features: [
      "Subdomain on doctrinally.ai",
      "Unlimited document uploads",
      "1,000 messages/month",
      "Doctrinally.AI branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 9900,
    questionLimit: 2000,
    features: [
      "Custom domain",
      "Custom branding and logo",
      "Unlimited document uploads",
      "2,000 messages/month",
    ],
  },
} as const;

export type Plan = keyof typeof PLANS;

export const OVERAGE_PRICING = {
  question: 25,
} as const;

export const DOCUMENT_TYPES = [
  "youtube",
  "video",
  "pdf",
  "word",
  "platejs",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "draft",
  "uploaded",
  "queued",
  "processing",
  "indexed",
  "failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
