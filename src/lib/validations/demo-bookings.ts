import { z } from "zod";

export const createDemoBookingSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(200),
  slotStart: z.string().datetime(),
  agreedToTerms: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must agree to the Terms and Privacy Policy",
    }),
});

export type CreateDemoBookingInput = z.infer<typeof createDemoBookingSchema>;
