// One-off diagnostic: hits Mercury 2 through every reasonable call
// shape so we can see which ones return content and which don't.
//
// Run with:  npx tsx scripts/test-mercury.ts

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: false });

import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const baseURL =
  process.env.INCEPTION_BASE_URL || "https://api.inceptionlabs.ai/v1";
const apiKey = process.env.INCEPTION_API_KEY ?? "";
const modelName = process.env.AI_MODEL || "mercury-2";

const inception = createOpenAI({ baseURL, apiKey });

const SYSTEM =
  "You write short, warm opening lines for a church's website chat widget. Output just one short message, max 2 sentences, under 200 characters. No quotes, no markdown.";
const USER =
  "Write a warm opener for a first-time visitor on Example Church's website. Acknowledge that they're exploring and invite them to ask anything.";

function banner(label: string) {
  console.log("\n────────────────────────────────────────");
  console.log("▶ " + label);
  console.log("────────────────────────────────────────");
}

console.log("=== Mercury 2 diagnostic ===");
console.log("baseURL:", baseURL);
console.log(
  "apiKey :",
  apiKey ? `set (len=${apiKey.length}, head=${apiKey.slice(0, 8)}…)` : "MISSING",
);
console.log("model  :", modelName);

async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  banner(label);
  const t0 = Date.now();
  try {
    const result = await fn();
    console.log(`✓ done in ${Date.now() - t0}ms`);
    return result;
  } catch (err) {
    console.log(`✗ failed in ${Date.now() - t0}ms`);
    console.log(
      "  error:",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
    if (err instanceof Error && err.stack) {
      console.log("  stack:", err.stack.split("\n").slice(0, 3).join("\n  "));
    }
    return null;
  }
}

async function main() {
await run("generateText + prompt + messages-system", async () => {
  const r = await generateText({
    model: inception.chat(modelName),
    system: SYSTEM,
    prompt: USER,
    maxOutputTokens: 200,
    temperature: 0.5,
  });
  console.log("  text         :", JSON.stringify(r.text));
  console.log("  textLen      :", r.text?.length ?? 0);
  console.log("  finishReason :", r.finishReason);
  console.log("  usage        :", JSON.stringify(r.usage));
});

await run("generateText + messages array (system + user)", async () => {
  const r = await generateText({
    model: inception.chat(modelName),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: USER },
    ],
    maxOutputTokens: 200,
    temperature: 0.5,
  });
  console.log("  text         :", JSON.stringify(r.text));
  console.log("  textLen      :", r.text?.length ?? 0);
  console.log("  finishReason :", r.finishReason);
  console.log("  usage        :", JSON.stringify(r.usage));
});

await run("streamText + prompt", async () => {
  const r = streamText({
    model: inception.chat(modelName),
    system: SYSTEM,
    prompt: USER,
    maxOutputTokens: 200,
    temperature: 0.5,
  });
  let text = "";
  let chunks = 0;
  for await (const chunk of r.textStream) {
    text += chunk;
    chunks++;
  }
  console.log("  chunks       :", chunks);
  console.log("  text         :", JSON.stringify(text));
  console.log("  textLen      :", text.length);
  console.log("  finishReason :", await r.finishReason);
  console.log("  usage        :", JSON.stringify(await r.usage));
});

await run("streamText + messages array", async () => {
  const r = streamText({
    model: inception.chat(modelName),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: USER },
    ],
    maxOutputTokens: 200,
    temperature: 0.5,
  });
  let text = "";
  let chunks = 0;
  for await (const chunk of r.textStream) {
    text += chunk;
    chunks++;
  }
  console.log("  chunks       :", chunks);
  console.log("  text         :", JSON.stringify(text));
  console.log("  textLen      :", text.length);
  console.log("  finishReason :", await r.finishReason);
  console.log("  usage        :", JSON.stringify(await r.usage));
});

await run("raw fetch /chat/completions (non-streaming)", async () => {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER },
      ],
      max_tokens: 200,
      temperature: 0.5,
    }),
  });
  console.log("  status       :", res.status, res.statusText);
  const bodyText = await res.text();
  console.log(
    "  raw body     :",
    bodyText.length > 1500 ? bodyText.slice(0, 1500) + "…[truncated]" : bodyText,
  );
});

await run("raw fetch /chat/completions (stream: true)", async () => {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER },
      ],
      max_tokens: 200,
      temperature: 0.5,
      stream: true,
    }),
  });
  console.log("  status       :", res.status, res.statusText);
  if (!res.body) {
    console.log("  no body");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let text = "";
  let frames = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (!data || data === "[DONE]") continue;
    frames++;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) text += delta;
    } catch {
      // ignore unparseable line
    }
  }
  console.log("  SSE frames   :", frames);
  console.log("  text         :", JSON.stringify(text));
  console.log("  textLen      :", text.length);
  console.log(
    "  raw head     :",
    raw.slice(0, 500).replace(/\n/g, "\\n"),
  );
});

console.log("\n=== done ===\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
