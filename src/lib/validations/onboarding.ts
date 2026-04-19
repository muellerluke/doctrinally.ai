import { z } from "zod";

export const churchInfoSchema = z.object({
  name: z
    .string()
    .min(2, "Church name must be at least 2 characters")
    .max(100, "Church name must be at most 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
});

// Optional during onboarding — admins who don't have a website yet (or
// don't want auto-branding) can skip this step. When provided we accept
// either "mychurch.com" or "https://mychurch.com" and normalize later.
export const websiteDomainSchema = z
  .string()
  .trim()
  .max(253)
  .refine(
    (v) => {
      const host = v.replace(/^https?:\/\//i, "").split("/")[0];
      return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host);
    },
    { message: "Enter a valid website like 'mychurch.com'" }
  );

export const onboardingSchema = churchInfoSchema.extend({
  plan: z.enum(["standard", "enterprise"]),
  websiteDomain: websiteDomainSchema.optional().nullable(),
});

export type ChurchInfoInput = z.infer<typeof churchInfoSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
