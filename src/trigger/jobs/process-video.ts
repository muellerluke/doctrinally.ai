import { promises as fs } from "node:fs";
import { task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkTranscript } from "../utils/chunking";
import { generateEmbeddings } from "../utils/embeddings";
import { formatProcessingError, logProcessingError } from "../utils/error-logging";
import { transcribeWithWhisper, type WhisperSegment } from "../utils/whisper";
import {
  extractAudio,
  splitAudioForWhisper,
  createAudioWorkDir,
  cleanupWorkDir,
} from "../utils/audio";

export const processVideo = task({
  id: "process-video",
  machine: "large-1x", // 4 vCPU / 8 GB — ffmpeg audio extraction + transcription
  retry: { maxAttempts: 2 },
  run: async (payload: { documentId: string }) => {
    const { documentId } = payload;
    let workDir: string | null = null;

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

      if (!doc.blobPath) throw new Error("Document has no blob path");

      // 1. Stream video to disk and extract compressed audio via ffmpeg.
      //    The video is never loaded into memory — it streams straight to
      //    a temp file, then ffmpeg extracts mono 16kHz 64kbps MP3.
      workDir = await createAudioWorkDir();
      const audioPath = await extractAudio(doc.blobPath, workDir);

      // 2. Split audio into ≤24 MB segments if needed (Whisper's 25 MB limit).
      //    A typical 60-min sermon at 64kbps ≈ 29 MB → splits into 1-2 segments.
      const audioSegments = await splitAudioForWhisper(audioPath, workDir);

      // 3. Transcribe each segment and merge results with corrected timestamps.
      const allSegments: WhisperSegment[] = [];

      for (const segment of audioSegments) {
        const audioBuffer = await fs.readFile(segment.path);
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const filename = segment.path.split("/").pop() || "audio.mp3";

        const whisperSegments = await transcribeWithWhisper(audioBlob, filename);

        // Offset timestamps so they reflect position in the full video.
        for (const seg of whisperSegments) {
          allSegments.push({
            text: seg.text,
            start: seg.start + segment.offsetSeconds,
            end: seg.end + segment.offsetSeconds,
          });
        }
      }

      if (allSegments.length === 0) {
        throw new Error("No transcript segments returned from video");
      }

      // 4. Chunk transcript by time (~120 seconds per chunk) and embed.
      const transcriptChunks = chunkTranscript(allSegments, 120);

      if (transcriptChunks.length === 0) {
        throw new Error("No chunks generated from video transcript");
      }

      const texts = transcriptChunks.map((c) => c.text);
      const embeddings = await generateEmbeddings(texts);

      // 5. Replace existing chunks and insert new ones.
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

      // 6. Mark as indexed.
      await db
        .update(documents)
        .set({ status: "indexed", updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return {
        success: true,
        chunkCount: transcriptChunks.length,
        audioSegments: audioSegments.length,
      };
    } catch (error) {
      logProcessingError("process-video", error);
      const message = formatProcessingError(error);

      await db
        .update(documents)
        .set({
          status: "failed",
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      throw error;
    } finally {
      // Always clean up temp files, even on failure.
      if (workDir) await cleanupWorkDir(workDir);
    }
  },
});
