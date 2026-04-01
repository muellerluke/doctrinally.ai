import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkTranscript } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

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

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

      const videoResponse = await fetch(doc.blobPath);
      if (!videoResponse.ok)
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);

      const videoBlob = await videoResponse.blob();

      // Determine filename from blobPath or use a default
      const filename =
        doc.blobPath.split("/").pop() || "video.mp4";

      // Call OpenAI Whisper API for transcription
      const formData = new FormData();
      formData.append("file", videoBlob, filename);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");

      const whisperResponse = await fetch(WHISPER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        throw new Error(
          `Whisper API error (${whisperResponse.status}): ${errorText}`
        );
      }

      const whisperData: WhisperResponse = await whisperResponse.json();

      if (!whisperData.segments || whisperData.segments.length === 0) {
        throw new Error("No transcript segments returned from Whisper");
      }

      // Chunk transcript segments by time (~120 seconds per chunk)
      const transcriptChunks = chunkTranscript(whisperData.segments, 120);

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
