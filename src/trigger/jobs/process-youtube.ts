import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkTranscript } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";
import {
  fetchYouTubeCaptions,
  fetchSupadataTranscript,
} from "../utils/youtube";
import { extractVideoId } from "../utils/extract-video-id";
import type { WhisperSegment } from "../utils/whisper";

export async function processYouTubeBody(payload: { documentId: string }) {
  const { documentId } = payload;

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) throw new Error(`Document ${documentId} not found`);
    if (doc.type !== "youtube")
      throw new Error(`Document ${documentId} is not a YouTube document`);

    await db
      .update(documents)
      .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const videoId = extractVideoId(doc.sourceUrl!);
    if (!videoId)
      throw new Error(`Could not extract video ID from: ${doc.sourceUrl}`);

    // Two-tier transcript: free InnerTube captions first, Supadata fallback.
    let segments: WhisperSegment[];
    let transcriptSource: "captions" | "supadata";

    try {
      segments = await fetchYouTubeCaptions(videoId);
      transcriptSource = "captions";
    } catch (captionErr) {
      console.warn(
        `[process-youtube] Captions unavailable for ${videoId}, falling back to Supadata:`,
        captionErr instanceof Error ? captionErr.message : captionErr
      );
      segments = await fetchSupadataTranscript(videoId);
      transcriptSource = "supadata";
    }

    if (segments.length === 0) {
      throw new Error("No transcript available for this video");
    }

    const transcriptChunks = chunkTranscript(segments, 120);
    if (transcriptChunks.length === 0) {
      throw new Error("No content extracted from transcript");
    }

    const texts = transcriptChunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(texts);

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
    await db.insert(chunks).values(
      transcriptChunks.map((chunk, index) => ({
        documentId,
        churchId: doc.churchId,
        content: chunk.text,
        chunkIndex: index,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        embedding: embeddings[index],
      }))
    );

    await db
      .update(documents)
      .set({ status: "indexed", retryCount: 0, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return {
      success: true,
      chunkCount: transcriptChunks.length,
      transcriptSource,
    };
  } catch (error) {
    logProcessingError("process-youtube", error);
    const message = formatProcessingError(error);

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

export const processYouTube = task({
  id: "process-youtube",
  machine: "small-1x", // 1 vCPU / 512 MB — transcript fetching + embeddings
  retry: { maxAttempts: 2 },
  run: processYouTubeBody,
});
