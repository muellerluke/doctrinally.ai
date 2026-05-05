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

// Required during onboarding so we always have something to crawl after
// payment. Accepts either "mychurch.com" or "https://mychurch.com" and
// normalizes later.
export const websiteDomainSchema = z
  .string()
  .trim()
  .min(1, "Enter your church website")
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
  websiteDomain: websiteDomainSchema,
});

export type ChurchInfoInput = z.infer<typeof churchInfoSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
