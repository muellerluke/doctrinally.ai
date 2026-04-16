import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { tasks } from "@trigger.dev/sdk/v3";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getActiveMembershipForUser } from "@/lib/active-church";

// Client-direct upload via @vercel/blob/client. The browser uploads bytes
// straight to Blob storage; this route only signs a token and receives a
// webhook callback when the upload finishes. This bypasses Vercel's 4.5 MB
// serverless body limit that previously caused 413 errors on large files.

const TYPE_TO_TASK: Record<string, string> = {
  pdf: "process-pdf",
  word: "process-word",
  video: "process-video",
};

// Per-MIME ceilings. Videos up to 2 GB; docs capped smaller because there
// is no legitimate need for a 2 GB PDF and it keeps abuse contained.
const MAX_FILE_SIZE: Record<string, number> = {
  "application/pdf": 50 * 1024 * 1024, // 50 MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    50 * 1024 * 1024, // 50 MB
  "video/mp4": 2 * 1024 * 1024 * 1024, // 2 GB
  "video/webm": 2 * 1024 * 1024 * 1024,
  "video/quicktime": 2 * 1024 * 1024 * 1024,
};

const MIME_TO_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

// Ceiling passed to Vercel Blob. Per-type limits are enforced below
// against the clientPayload size before the token is signed.
const GLOBAL_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

interface ClientPayload {
  title: string;
  tags?: string;
  folderId?: string | null;
  fileType: string;
  fileSize: number;
}

interface TokenPayload {
  documentId: string;
  churchId: string;
  userId: string;
  docType: "pdf" | "word" | "video";
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Phase 1: client asks for a signed token. We run auth + validation
      // here using only the file metadata in clientPayload (no bytes yet),
      // create the documents row in "uploaded" state so the library can
      // render it immediately, and return a tokenPayload the webhook will
      // receive in phase 2.
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
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

        const { title, tags, folderId, fileType, fileSize } = payload;

        if (!title || title.length < 2) {
          throw new Error("Title is required (min 2 characters)");
        }

        const docType = MIME_TO_TYPE[fileType] as
          | "pdf"
          | "word"
          | "video"
          | undefined;
        if (!docType) {
          throw new Error(
            "Unsupported file type. Please upload a PDF, Word document, or video."
          );
        }

        const maxSize = MAX_FILE_SIZE[fileType] ?? 50 * 1024 * 1024;
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

        // Create the row up-front so router.refresh() on the client shows
        // the file immediately. onUploadCompleted will fill in blobPath
        // and flip status to "queued" once the upload actually lands.
        const [doc] = await db
          .insert(documents)
          .values({
            churchId: membership.churchId,
            uploadedBy: session.user.id,
            title,
            type: docType,
            status: "uploaded",
            folderId: folderId || null,
            metadata: { tags: parsedTags },
          })
          .returning({ id: documents.id });

        const tokenPayload: TokenPayload = {
          documentId: doc.id,
          churchId: membership.churchId,
          userId: session.user.id,
          docType,
        };

        return {
          allowedContentTypes: Object.keys(MIME_TO_TYPE),
          maximumSizeInBytes: GLOBAL_MAX_BYTES,
          tokenPayload: JSON.stringify(tokenPayload),
          addRandomSuffix: true,
        };
      },

      // Phase 2: Blob storage calls this after the upload completes. Flip
      // the row to "queued", record the public URL, bump usage, and hand
      // off to Trigger.dev for processing.
      //
      // NOTE: In local dev this callback cannot reach localhost from
      // Vercel Blob. The documents row still exists from phase 1 (status
      // "uploaded") — use `vercel dev` or an ngrok tunnel to exercise the
      // full pipeline locally.
      onUploadCompleted: async ({ blob, tokenPayload: tokenPayloadRaw }) => {
        if (!tokenPayloadRaw) return;

        let payload: TokenPayload;
        try {
          payload = JSON.parse(tokenPayloadRaw) as TokenPayload;
        } catch {
          console.error("Invalid tokenPayload on upload completion");
          return;
        }

        const { documentId, churchId, docType } = payload;

        await db
          .update(documents)
          .set({
            status: "queued",
            blobPath: blob.url,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        const taskId = TYPE_TO_TASK[docType];
        if (taskId) {
          try {
            await tasks.trigger(taskId, { documentId });
          } catch (err) {
            console.error(`Failed to trigger ${taskId} for ${documentId}:`, err);
            await db
              .update(documents)
              .set({
                status: "failed",
                errorMessage: "Failed to queue processing task",
                updatedAt: new Date(),
              })
              .where(eq(documents.id, documentId));
          }
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
