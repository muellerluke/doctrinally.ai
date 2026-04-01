import { z } from "zod";

export const youtubeUploadSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  sourceUrl: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) =>
        url.includes("youtube.com") ||
        url.includes("youtu.be"),
      "Must be a YouTube URL"
    ),
  tags: z.array(z.string()).optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
});

export const fileUploadSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  type: z.enum(["pdf", "word", "video"]),
  tags: z.array(z.string()).optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
});

export const platejsDocumentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  content: z.string().optional().default(""),
  tags: z.array(z.string()).optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
});

export const documentMetadataSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  tags: z.array(z.string()).optional().nullable(),
});

export type YouTubeUploadInput = z.infer<typeof youtubeUploadSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type PlatejsDocumentInput = z.infer<typeof platejsDocumentSchema>;
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
