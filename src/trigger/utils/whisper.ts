const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export interface WhisperSegment {
  text: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

/**
 * Transcribe an audio blob using OpenAI Whisper.
 * Returns verbose_json segments with start/end timestamps in seconds.
 *
 * The caller is responsible for ensuring each blob is ≤25 MB (Whisper's
 * hard limit). Use `splitAudioForWhisper()` from `./audio.ts` to split
 * larger files before calling this function.
 */
export async function transcribeWithWhisper(
  file: Blob,
  filename: string
): Promise<WhisperSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const response = await fetch(WHISPER_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Whisper API error (${response.status}): ${errorText}`
    );
  }

  const data: WhisperResponse = await response.json();

  if (!data.segments || data.segments.length === 0) {
    throw new Error("No transcript segments returned from Whisper");
  }

  return data.segments;
}
