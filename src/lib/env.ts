import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_DOMAIN: z.string().min(1),

  // Phase 3+
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Phase 5+
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  TRIGGER_SECRET_KEY: z.string().optional(),

  // Phase 6+
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
