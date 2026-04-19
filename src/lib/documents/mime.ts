/**
 * Shared MIME-type mappings for direct-upload document processing.
 * Used by the upload route's token generation and the client-side
 * confirmBlobUpload fallback so both resolve docType the same way.
 *
 * Video coverage is intentionally broad because browsers map the same
 * extension to different MIME types — Chrome calls `.m4v` `video/mp4`
 * while Safari calls it `video/x-m4v`, and some browsers hand us
 * `application/octet-stream` for anything unusual. The filename-based
 * fallback in `resolveDocType` catches those cases.
 */

export type UploadDocType = "pdf" | "word" | "video";

/** MIME type → our internal doc type. */
export const MIME_TO_TYPE: Record<string, UploadDocType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
  // Video — ffmpeg reads all of these fine; we just have to let them past
  // Vercel Blob's allowedContentTypes check.
  "video/mp4": "video", // .mp4, .m4v (most browsers), .m4a (audio — but docType=video is fine)
  "video/x-m4v": "video", // .m4v (Safari, macOS)
  "video/webm": "video", // .webm
  "video/quicktime": "video", // .mov, .qt
  "video/x-matroska": "video", // .mkv
  "video/x-msvideo": "video", // .avi
  "video/ogg": "video", // .ogv, .ogg
  "video/3gpp": "video", // .3gp
  "video/3gpp2": "video", // .3g2
  "video/x-flv": "video", // .flv
  "video/mp2t": "video", // .ts (MPEG transport stream, not TypeScript)
  "video/mpeg": "video", // .mpeg, .mpg
  // Generic upload fallback — resolveDocType's filename path decides whether
  // this is a video or something else.
};

/** Filename extension → our internal doc type. Used as a fallback when the
 *  browser-supplied MIME is blank or `application/octet-stream`. */
const EXT_TO_TYPE: Record<string, UploadDocType> = {
  pdf: "pdf",
  docx: "word",
  mp4: "video",
  m4v: "video",
  mov: "video",
  qt: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  ogv: "video",
  ogg: "video",
  "3gp": "video",
  "3g2": "video",
  flv: "video",
  ts: "video",
  mts: "video",
  m2ts: "video",
  mpeg: "video",
  mpg: "video",
  wmv: "video",
};

/** Per-doc-type upload ceiling in bytes. Applied as a fallback to any MIME
 *  not listed in MAX_FILE_SIZE. */
const DEFAULT_MAX_BY_TYPE: Record<UploadDocType, number> = {
  pdf: 50 * 1024 * 1024, // 50 MB
  word: 50 * 1024 * 1024, // 50 MB
  // 5 GB fits a 45-min sermon at high 1080p bitrates (~12 Mbps ≈ 4 GB) or
  // a 90-min sermon at typical quality, with margin. We stream uploads
  // straight to disk on the worker and delete the temp video right after
  // audio extraction, so disk usage scales with the upload but never
  // persists or inflates.
  video: 5 * 1024 * 1024 * 1024, // 5 GB
};

// Per-MIME upload ceilings. Kept for backward compat with callers that
// look up by MIME — falls back to the per-type default below.
export const MAX_FILE_SIZE: Record<string, number> = Object.fromEntries(
  Object.entries(MIME_TO_TYPE).map(([mime, type]) => [
    mime,
    DEFAULT_MAX_BY_TYPE[type],
  ])
);

export function getMaxFileSize(docType: UploadDocType): number {
  return DEFAULT_MAX_BY_TYPE[docType];
}

/**
 * Resolve a file's doc type from its browser-reported MIME and (optionally)
 * its filename. Prefers MIME; falls back to extension so obscure/mislabeled
 * uploads (e.g. Safari handing us `application/octet-stream` for a .m4v)
 * still land in the right pipeline.
 */
export function resolveDocType(
  fileType: string,
  filename?: string
): UploadDocType | undefined {
  if (fileType && MIME_TO_TYPE[fileType]) return MIME_TO_TYPE[fileType];
  if (filename) {
    const ext = extensionOf(filename);
    if (ext && EXT_TO_TYPE[ext]) return EXT_TO_TYPE[ext];
  }
  return undefined;
}

function extensionOf(filename: string): string | null {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === filename.length - 1) return null;
  return filename.slice(dotIdx + 1).toLowerCase();
}
