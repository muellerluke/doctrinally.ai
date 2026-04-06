import { execFile } from "node:child_process";
import { createWriteStream, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

// Resolve ffmpeg/ffprobe paths. The Trigger.dev ffmpeg() build extension
// sets FFMPEG_PATH and FFPROBE_PATH env vars in the container.
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

// Whisper's hard limit is 25 MB. We target 24 MB to leave a safety margin.
const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

// At 64 kbps mono, 1 second ≈ 8 KB → 24 MB ≈ 3000 seconds (50 min).
// We use 2700 seconds (45 min) per segment to comfortably stay under 24 MB.
const SEGMENT_DURATION_SECS = 2700;

/**
 * Run ffmpeg as a child process and return a promise.
 * Uses execFile (not exec) to avoid shell injection.
 */
function ffmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG_BIN, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ffmpeg failed: ${stderr || err.message}`));
      } else {
        resolve(stderr); // ffmpeg writes progress info to stderr
      }
    });
  });
}

/**
 * Get the duration of an audio file in seconds using ffprobe.
 */
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      FFPROBE_BIN,
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        filePath,
      ],
      (err, stdout) => {
        if (err) reject(new Error(`ffprobe failed: ${err.message}`));
        else resolve(parseFloat(stdout.trim()));
      }
    );
  });
}

/**
 * Stream a video from a URL to a temp file, then extract the audio track
 * as a compressed MP3 optimized for Whisper (mono, 16 kHz, 64 kbps).
 *
 * Returns the path to the extracted MP3 file. The caller is responsible
 * for cleaning up the temp directory.
 */
export async function extractAudio(
  videoUrl: string,
  workDir: string
): Promise<string> {
  const videoPath = join(workDir, `video-${randomUUID()}.mp4`);
  const audioPath = join(workDir, `audio-${randomUUID()}.mp3`);

  // Stream video to disk — never buffer the full video in memory.
  const response = await fetch(videoUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  await pipeline(
    Readable.fromWeb(response.body as any),
    createWriteStream(videoPath)
  );

  // Extract audio: mono, 16 kHz, 64 kbps MP3 — Whisper's sweet spot.
  // A 60 min sermon → ~29 MB, a 90 min sermon → ~43 MB.
  await ffmpeg([
    "-i", videoPath,
    "-vn",           // no video
    "-ac", "1",      // mono
    "-ar", "16000",  // 16 kHz sample rate
    "-b:a", "64k",   // 64 kbps bitrate
    "-y",            // overwrite output
    audioPath,
  ]);

  // Delete the video file — we only need the audio from here on.
  await fs.unlink(videoPath).catch(() => {});

  return audioPath;
}

export interface AudioSegment {
  path: string;
  offsetSeconds: number;
}

/**
 * If the audio file is small enough for Whisper (≤24 MB), return it as-is.
 * Otherwise, split it into segments that each fit under the limit.
 *
 * Each segment includes an `offsetSeconds` value so the caller can adjust
 * Whisper timestamps to produce a correct global timeline.
 */
export async function splitAudioForWhisper(
  audioPath: string,
  workDir: string
): Promise<AudioSegment[]> {
  const stat = await fs.stat(audioPath);

  // Small enough — no split needed.
  if (stat.size <= WHISPER_MAX_BYTES) {
    return [{ path: audioPath, offsetSeconds: 0 }];
  }

  // Get total duration to calculate segment boundaries.
  const totalDuration = await getAudioDuration(audioPath);

  // Split into fixed-duration segments using ffmpeg's segment muxer.
  const segmentPattern = join(workDir, "segment-%03d.mp3");
  await ffmpeg([
    "-i", audioPath,
    "-f", "segment",
    "-segment_time", String(SEGMENT_DURATION_SECS),
    "-c", "copy",         // no re-encoding — fast
    "-reset_timestamps", "1",
    "-y",
    segmentPattern,
  ]);

  // Discover the segment files that were created.
  const files = await fs.readdir(workDir);
  const segmentFiles = files
    .filter((f) => f.startsWith("segment-") && f.endsWith(".mp3"))
    .sort();

  const segments: AudioSegment[] = [];
  for (let i = 0; i < segmentFiles.length; i++) {
    segments.push({
      path: join(workDir, segmentFiles[i]),
      offsetSeconds: i * SEGMENT_DURATION_SECS,
    });
  }

  // Delete the original unsplit audio file.
  await fs.unlink(audioPath).catch(() => {});

  return segments;
}

/**
 * Create a temporary working directory for audio processing.
 * Returns the path. The caller must clean it up when done.
 */
export async function createAudioWorkDir(): Promise<string> {
  const dir = join(tmpdir(), `doctrinally-audio-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Remove a working directory and all its contents.
 */
export async function cleanupWorkDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}
