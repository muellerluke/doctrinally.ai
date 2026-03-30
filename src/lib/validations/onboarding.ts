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

export const onboardingSchema = churchInfoSchema.extend({
  plan: z.enum(["standard", "enterprise"]),
});

export type ChurchInfoInput = z.infer<typeof churchInfoSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
