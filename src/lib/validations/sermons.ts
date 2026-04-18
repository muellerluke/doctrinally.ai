import { z } from "zod";

export const createSermonSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200)
    .optional()
    .default("Untitled sermon"),
});

export const publishSermonSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(2).max(200),
  speaker: z.string().max(120).optional().nullable(),
  sermonDate: z.string().max(40).optional().nullable(),
  series: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  membersSearchable: z.boolean().default(false),
});

export type CreateSermonInput = z.infer<typeof createSermonSchema>;
export type PublishSermonInput = z.infer<typeof publishSermonSchema>;
