import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import fs from "node:fs";
import path from "node:path";

const FIXTURES = path.resolve(__dirname, "../../fixtures");

// ─── Deterministic embedding fixture ───────────────────────────────────
//
// Same input → same 1536-dim unit vector. Lets semantic search tests
// assert stable ordering across runs.
function fakeEmbedding(text: string, dim = 1536): number[] {
  const out = new Array(dim).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < dim; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    out[i] = ((h >>> 0) / 0xffffffff) * 2 - 1;
  }
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
  return out.map((v) => v / norm);
}

// ─── Handlers ──────────────────────────────────────────────────────────

export const openAiEmbeddingsHandler = http.post(
  "https://api.openai.com/v1/embeddings",
  async ({ request }) => {
    const body = (await request.json()) as { input: string | string[] };
    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    return HttpResponse.json({
      object: "list",
      model: "text-embedding-3-small",
      data: inputs.map((input, i) => ({
        object: "embedding",
        index: i,
        embedding: fakeEmbedding(input),
      })),
      usage: { prompt_tokens: inputs.length, total_tokens: inputs.length },
    });
  }
);

export const openAiChatCompletionsHandler = http.post(
  "https://api.openai.com/v1/chat/completions",
  async () => {
    // Minimal non-streaming response — covers `generateObject` / non-stream calls
    // used by classify-message. Chat route streaming is mocked separately at
    // the `ai` SDK level in tests that need it.
    return HttpResponse.json({
      id: "chatcmpl-test",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: '{"newTopicLabel":"General"}' },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  }
);

export const supadataTranscriptHandler = http.get(
  "https://api.supadata.ai/v1/transcript",
  () =>
    HttpResponse.json({
      content: [
        { text: "Welcome to our sermon.", offset: 0, duration: 3000 },
        { text: "Today we discuss faith.", offset: 3000, duration: 4000 },
      ],
    })
);

// ─── Vercel Blob fixture server ────────────────────────────────────────
//
// Tests set doc.blobPath = "https://blob.test/<fixture-name>". The
// processing jobs `fetch(blobPath)` and get real fixture bytes.
export const blobHandler = http.get("https://blob.test/:filename", ({ params }) => {
  const filename = params.filename as string;
  const filePath = path.join(FIXTURES, filename);
  if (!fs.existsSync(filePath)) {
    return new HttpResponse(null, { status: 404 });
  }
  const bytes = fs.readFileSync(filePath);
  return new HttpResponse(bytes, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes.length),
    },
  });
});

export const defaultHandlers = [
  openAiEmbeddingsHandler,
  openAiChatCompletionsHandler,
  supadataTranscriptHandler,
  blobHandler,
];

export const server = setupServer(...defaultHandlers);

export { fakeEmbedding };
