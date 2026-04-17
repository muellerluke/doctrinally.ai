import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetTestDbData } from "../../helpers/db";
import { makeOwnerWithChurch } from "../../helpers/factories";

// Mock the AI SDK so we never actually stream from OpenAI. If the chat route
// reaches the streaming path, that's a test failure for a limit-breached case.
const streamTextSpy = vi.fn(() => ({
  toTextStreamResponse: () =>
    new Response("mock stream", { status: 200 }),
  fullStream: (async function* () {
    yield { type: "text-delta", textDelta: "hi" };
  })(),
  textStream: (async function* () {
    yield "hi";
  })(),
}));
vi.mock("ai", () => ({
  streamText: streamTextSpy,
  tool: (def: unknown) => def,
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: () => ({}),
}));

// No authenticated session by default — chat allows anonymous.
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

// Stub retrieval so we don't hit the embeddings endpoint.
vi.mock("@/lib/retrieval", () => ({
  hybridSearch: vi.fn(async () => []),
  generateQueryEmbedding: vi.fn(async () => []),
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: vi.fn() },
}));

const { POST } = await import("@/app/api/chat/route");

describe("POST /api/chat — usage limits", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
  });

  async function chat(churchId: string, message = "Hello") {
    return POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          churchName: "Test",
          messages: [{ role: "user", content: message }],
        }),
      })
    );
  }

  it("rejects with 403 when subscription is canceled", async () => {
    const { church } = await makeOwnerWithChurch({ status: "canceled" });
    const res = await chat(church.id);
    expect(res.status).toBe(403);
    expect(streamTextSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when churchId is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns message_limit_reached (403) when questions >= effectiveMax without overage", async () => {
    const { church, usage } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
      questionLimit: 1500,
    });

    // Bump usage to the limit.
    const { getTestDb } = await import("../../helpers/db");
    const db = getTestDb();
    await db.execute(
      (await import("drizzle-orm")).sql`
        UPDATE usage_records SET questions = 1500 WHERE id = ${usage.id}
      `
    );

    const res = await chat(church.id);
    expect(res.status).toBe(403);
    const payload = await res.json();
    expect(payload.error).toBe("message_limit_reached");
    expect(streamTextSpy).not.toHaveBeenCalled();
  });

  it("blocks when subscription does not exist for the church", async () => {
    // Valid UUID that matches no subscription.
    const res = await chat("00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(403);
  });
});
