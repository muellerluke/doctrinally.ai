import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkTranscript } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { transcribeWithWhisper } from "../utils/whisper";

export const processVideo = task({
  id: "process-video",
  run: async (payload: { documentId: string }) => {
    const { documentId } = payload;

    try {
      // Fetch document
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!doc) throw new Error(`Document ${documentId} not found`);
      if (doc.type !== "video")
        throw new Error(`Document ${documentId} is not a video document`);

      // Set processing status
      await db
        .update(documents)
        .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Download video from blob storage
      if (!doc.blobPath) throw new Error("Document has no blob path");

      const videoResponse = await fetch(doc.blobPath);
      if (!videoResponse.ok)
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);

      const videoBlob = await videoResponse.blob();

      // Determine filename from blobPath or use a default
      const filename =
        doc.blobPath.split("/").pop() || "video.mp4";

      // Transcribe via shared Whisper util
      const segments = await transcribeWithWhisper(videoBlob, filename);

      // Chunk transcript segments by time (~120 seconds per chunk)
      const transcriptChunks = chunkTranscript(segments, 120);

      if (transcriptChunks.length === 0) {
        throw new Error("No chunks generated from video transcript");
      }

      // Generate embeddings
      const texts = transcriptChunks.map((c) => c.text);
      const embeddings = await generateEmbeddings(texts);

      // Delete existing chunks for this document
      await db.delete(chunks).where(eq(chunks.documentId, documentId));

      // Insert new chunks
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

      // Mark as indexed
      await db
        .update(documents)
        .set({ status: "indexed", updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return { success: true, chunkCount: transcriptChunks.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";

      await db
        .update(documents)
        .set({
          status: "failed",
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      throw error;
    }
  },
});
