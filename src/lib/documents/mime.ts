/**
 * Shared MIME-type mappings for direct-upload document processing.
 * Used by the upload route's token generation and the client-side
 * confirmBlobUpload fallback so both resolve docType the same way.
 */

export type UploadDocType = "pdf" | "word" | "video";

export const MIME_TO_TYPE: Record<string, UploadDocType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

// Per-MIME upload ceilings. Videos up to 2 GB; docs capped smaller because
// there is no legitimate need for a 2 GB PDF and it keeps abuse contained.
export const MAX_FILE_SIZE: Record<string, number> = {
  "application/pdf": 50 * 1024 * 1024, // 50 MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    50 * 1024 * 1024, // 50 MB
  "video/mp4": 2 * 1024 * 1024 * 1024, // 2 GB
  "video/webm": 2 * 1024 * 1024 * 1024,
  "video/quicktime": 2 * 1024 * 1024 * 1024,
};

export function resolveDocType(fileType: string): UploadDocType | undefined {
  return MIME_TO_TYPE[fileType];
}
