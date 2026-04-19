import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_DOMAIN: z.string().min(1),

  // Phase 3 - Stripe (required for billing features)
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_STANDARD_PRICE_ID: z.string().min(1),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1),

  // Phase 5 - Storage, Background Jobs, AI
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  TRIGGER_SECRET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Supadata - YouTube transcript fallback
  SUPADATA_API_KEY: z.string().optional(),

  // Firecrawl - church website crawling + branding extraction
  FIRECRAWL_API_KEY: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Phase 9 - Vercel Domain Management
  VERCEL_API_TOKEN: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
