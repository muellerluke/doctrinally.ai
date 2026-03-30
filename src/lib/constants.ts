export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = {
  standard: {
    name: "Standard",
    priceMonthly: 4900,
    documentUploadLimit: 25,
    questionLimit: 500,
    features: [
      "Subdomain on doctrinally.ai",
      "Up to 25 document uploads/month",
      "500 questions/month",
      "Doctrinally.AI branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 9900,
    documentUploadLimit: 100,
    questionLimit: 2000,
    features: [
      "Custom domain",
      "Custom branding and logo",
      "Up to 100 document uploads/month",
      "2,000 questions/month",
    ],
  },
} as const;

export type Plan = keyof typeof PLANS;

export const OVERAGE_PRICING = {
  documentUpload: 50,
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
