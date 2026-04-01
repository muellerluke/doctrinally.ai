import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkTranscript } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { YoutubeTranscript } from "youtube-transcript";

/**
 * Extract YouTube video ID from a URL.
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const processYouTube = task({
  id: "process-youtube",
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
      if (doc.type !== "youtube")
        throw new Error(`Document ${documentId} is not a YouTube document`);

      // Set processing status
      await db
        .update(documents)
        .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Extract video ID
      const videoId = extractVideoId(doc.sourceUrl!);
      if (!videoId) throw new Error(`Could not extract video ID from: ${doc.sourceUrl}`);

      // Fetch transcript
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      if (!transcript || transcript.length === 0) {
        throw new Error("No transcript available for this video");
      }

      // Map transcript to segments with start/end times
      const segments = transcript.map((entry, i) => ({
        text: entry.text,
        start: entry.offset / 1000, // Convert ms to seconds
        end: (entry.offset + entry.duration) / 1000,
      }));

      // Chunk transcript into ~120 second segments
      const transcriptChunks = chunkTranscript(segments, 120);

      if (transcriptChunks.length === 0) {
        throw new Error("No content extracted from transcript");
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
