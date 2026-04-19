import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { upsertUploadedDocument } from "@/lib/actions/documents";
import {
  MIME_TO_TYPE,
  MAX_FILE_SIZE,
  resolveDocType,
  type UploadDocType,
} from "@/lib/documents/mime";

// Client-direct upload via @vercel/blob/client. The browser uploads bytes
// straight to Blob storage; this route only signs a token and receives a
// webhook callback when the upload finishes. This bypasses Vercel's 4.5 MB
// serverless body limit that previously caused 413 errors on large files.
//
// No `documents` row is created during Phase 1 — the row only exists if
// the bytes actually land, enforced by writing rows exclusively from
// Phase 2 (`onUploadCompleted`) or its client-side fallback
// (`confirmBlobUpload`). Both paths share `upsertUploadedDocument`, which
// is idempotent via the correlation `uploadId`.

// Ceiling passed to Vercel Blob. Per-type limits are enforced below
// against the clientPayload size before the token is signed.
const GLOBAL_MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface ClientPayload {
  title: string;
  tags?: string;
  folderId?: string | null;
  fileType: string;
  /** Original filename — used as a server-side fallback for docType
   *  resolution when `fileType` is blank or `application/octet-stream`
   *  (common for .m4v, .mkv, and other less-popular video containers). */
  fileName?: string;
  fileSize: number;
  /** Client-generated correlation ID; carries from Phase 1 through the
   *  webhook into the eventual `documents` row, and gates the
   *  `confirmBlobUpload` fallback. */
  uploadId: string;
}

interface TokenPayload {
  churchId: string;
  userId: string;
  docType: UploadDocType;
  title: string;
  tags: string[];
  folderId: string | null;
  uploadId: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Phase 1: client asks for a signed token. We run auth + validation
      // here using only the file metadata in clientPayload (no bytes yet)
      // and return a tokenPayload the webhook will receive in phase 2.
      // NOTE: no DB row is created here — see top-of-file comment.
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const active = await getActiveMembershipForUser(session.user.id);
        if (!active) {
          throw new Error("No church found");
        }
        const membership = active.membership;

        if (!clientPayloadRaw) {
          throw new Error("Missing upload metadata");
        }

        let payload: ClientPayload;
        try {
          payload = JSON.parse(clientPayloadRaw) as ClientPayload;
        } catch {
          throw new Error("Invalid upload metadata");
        }

        const {
          title,
          tags,
          folderId,
          fileType,
          fileName,
          fileSize,
          uploadId,
        } = payload;

        if (!title || title.length < 2) {
          throw new Error("Title is required (min 2 characters)");
        }

        if (!uploadId) {
          throw new Error("Missing uploadId");
        }

        const docType = resolveDocType(fileType, fileName);
        if (!docType) {
          throw new Error(
            "Unsupported file type. Please upload a PDF, Word document, or video."
          );
        }

        // Prefer the MIME-specific ceiling, fall back to the per-docType
        // default so novel video MIMEs (e.g. Safari sending video/x-m4v)
        // still get the 5 GB video cap instead of the 50 MB pdf/word cap.
        const maxSize =
          MAX_FILE_SIZE[fileType] ??
          (docType === "video"
            ? 5 * 1024 * 1024 * 1024
            : 50 * 1024 * 1024);
        if (typeof fileSize !== "number" || fileSize <= 0) {
          throw new Error("Invalid file size");
        }
        if (fileSize > maxSize) {
          throw new Error(
            `File is too large. Maximum size for ${docType} is ${Math.round(
              maxSize / 1024 / 1024
            )} MB.`
          );
        }

        const parsedTags = tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

        const tokenPayload: TokenPayload = {
          churchId: membership.churchId,
          userId: session.user.id,
          docType,
          title,
          tags: parsedTags,
          folderId: folderId ?? null,
          uploadId,
        };

        return {
          allowedContentTypes: Object.keys(MIME_TO_TYPE),
          maximumSizeInBytes: GLOBAL_MAX_BYTES,
          tokenPayload: JSON.stringify(tokenPayload),
          addRandomSuffix: true,
        };
      },

      // Phase 2: Blob storage calls this after the upload completes.
      // Inserts the row (idempotent via uploadId) and hands off to
      // Trigger.dev for processing.
      //
      // NOTE: In local dev this callback cannot reach localhost from
      // Vercel Blob. The client-side fallback `confirmBlobUpload` runs
      // after `upload()` resolves and uses the same shared helper, so the
      // row still gets created — just on the client-triggered path.
      onUploadCompleted: async ({ blob, tokenPayload: tokenPayloadRaw }) => {
        if (!tokenPayloadRaw) return;

        let payload: TokenPayload;
        try {
          payload = JSON.parse(tokenPayloadRaw) as TokenPayload;
        } catch {
          console.error("Invalid tokenPayload on upload completion");
          return;
        }

        try {
          await upsertUploadedDocument({
            churchId: payload.churchId,
            uploadedBy: payload.userId,
            title: payload.title,
            docType: payload.docType,
            folderId: payload.folderId,
            tags: payload.tags,
            uploadId: payload.uploadId,
            blobPath: blob.url,
          });
        } catch (err) {
          console.error(
            `Failed to upsert document for uploadId=${payload.uploadId}:`,
            err
          );
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    // handleUpload throws for validation AND for webhook signature failures;
    // 400 is the right default for client-visible errors.
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
