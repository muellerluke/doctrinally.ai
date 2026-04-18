import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetTestDbData } from "../../helpers/db";
import { makeOwnerWithChurch } from "../../helpers/factories";
import type { RetrievedChunk } from "@/lib/types/citations";

// Capture the arguments streamText is called with so we can inspect the
// final messages array after RAG injection and history trimming.
const streamTextSpy = vi.fn((args: unknown) => {
  void args;
  return {
    toTextStreamResponse: () =>
      new Response("mock stream", { status: 200 }),
    textStream: (async function* () {
      yield "ok";
    })(),
    steps: Promise.resolve([]),
  };
});

vi.mock("ai", () => ({
  streamText: streamTextSpy,
  tool: (def: unknown) => def,
  jsonSchema: (schema: unknown) => schema,
  stepCountIs: (n: number) => n,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ chat: () => ({}) }),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

const hybridSearchMock = vi.fn<
  (churchId: string, query: string, k: number) => Promise<RetrievedChunk[]>
>();

vi.mock("@/lib/retrieval", () => ({
  hybridSearch: (churchId: string, query: string, k: number) =>
    hybridSearchMock(churchId, query, k),
  generateQueryEmbedding: vi.fn(async () => []),
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: vi.fn() },
}));

const { POST } = await import("@/app/api/chat/route");

function makeChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "d1",
    documentTitle: "Sermon",
    documentType: "platejs",
    content: "chunk content",
    semanticSimilarity: 0.9,
    ...overrides,
  };
}

async function postChat(
  churchId: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        churchId,
        churchName: "Test",
        messages,
      }),
    })
  );
}

describe("POST /api/chat — eager RAG + history trimming", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
    hybridSearchMock.mockReset();
  });

  it("calls hybridSearch with the last user message text", async () => {
    const { church } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
    });
    hybridSearchMock.mockResolvedValue([]);

    const res = await postChat(church.id, [
      { role: "user", content: "What does our church teach about grace?" },
    ]);

    // Consume the stream so the handler's ReadableStream runs to completion.
    await res.text();

    expect(hybridSearchMock).toHaveBeenCalledTimes(1);
    const [calledChurchId, calledQuery, calledK] =
      hybridSearchMock.mock.calls[0];
    expect(calledChurchId).toBe(church.id);
    expect(calledQuery).toBe("What does our church teach about grace?");
    expect(calledK).toBe(6);
  });

  it("prepends a deterministic <retrieved_context> block to the last user message", async () => {
    const { church } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
    });

    // Return chunks in non-sorted order to verify the route sorts by chunkId.
    hybridSearchMock.mockResolvedValue([
      makeChunk({ chunkId: "ccc", content: "charlie-content" }),
      makeChunk({ chunkId: "aaa", content: "alpha-content" }),
      makeChunk({ chunkId: "bbb", content: "bravo-content" }),
    ]);

    const res = await postChat(church.id, [
      { role: "user", content: "tell me about grace" },
    ]);
    await res.text();

    expect(streamTextSpy).toHaveBeenCalledTimes(1);
    const callArgs = streamTextSpy.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    const lastMessage = callArgs.messages.at(-1)!;
    expect(lastMessage.role).toBe("user");

    // RAG prefix first, original user text at the end
    expect(lastMessage.content).toMatch(/^<retrieved_context>/);
    expect(lastMessage.content.endsWith("tell me about grace")).toBe(true);

    // Chunks ordered alpha → bravo → charlie (by chunkId)
    const alphaIdx = lastMessage.content.indexOf("alpha-content");
    const bravoIdx = lastMessage.content.indexOf("bravo-content");
    const charlieIdx = lastMessage.content.indexOf("charlie-content");
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeLessThan(bravoIdx);
    expect(bravoIdx).toBeLessThan(charlieIdx);
  });

  it("filters out low-relevance chunks below the per-scale thresholds", async () => {
    const { church } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
    });

    hybridSearchMock.mockResolvedValue([
      makeChunk({
        chunkId: "good",
        content: "relevant",
        semanticSimilarity: 0.8,
      }),
      makeChunk({
        chunkId: "bad",
        content: "noise",
        semanticSimilarity: 0.1, // below 0.3 floor
        keywordRank: 0.005, // below 0.01 floor
      }),
    ]);

    const res = await postChat(church.id, [
      { role: "user", content: "query" },
    ]);
    await res.text();

    const callArgs = streamTextSpy.mock.calls[0][0] as {
      messages: { content: string }[];
    };
    const lastContent = callArgs.messages.at(-1)!.content;
    expect(lastContent).toContain("relevant");
    expect(lastContent).not.toContain("noise");
  });

  it("emits no RAG block when every chunk is below thresholds", async () => {
    const { church } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
    });
    hybridSearchMock.mockResolvedValue([
      makeChunk({
        chunkId: "x",
        semanticSimilarity: 0.1,
        keywordRank: 0.001,
      }),
    ]);

    const res = await postChat(church.id, [
      { role: "user", content: "pure small talk" },
    ]);
    await res.text();

    const callArgs = streamTextSpy.mock.calls[0][0] as {
      messages: { content: string }[];
    };
    const lastContent = callArgs.messages.at(-1)!.content;
    expect(lastContent).not.toContain("<retrieved_context>");
    expect(lastContent).toBe("pure small talk");
  });

  it("trims the earliest messages when history balloons past the budget", async () => {
    const { church } = await makeOwnerWithChurch({
      plan: "standard",
      status: "active",
    });
    hybridSearchMock.mockResolvedValue([]);

    // Build a history that's definitely over 100k tokens. Each message is
    // ~1000 words (~1300 tokens); 100 of them is ~130k tokens. Mark the
    // very earliest with a sentinel so we can verify it got dropped.
    const giantWord = "word ".repeat(1000).trim();
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (let i = 0; i < 100; i++) {
      const marker = i === 0 ? "SENTINEL-OLDEST" : `msg-${i}`;
      history.push({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `${marker} ${giantWord}`,
      });
    }
    history.push({ role: "user", content: "SENTINEL-NEWEST follow-up" });

    const res = await postChat(church.id, history);
    await res.text();

    const callArgs = streamTextSpy.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    const concatenated = callArgs.messages
      .map((m) => m.content)
      .join("\n");

    // Current user message always survives
    expect(concatenated).toContain("SENTINEL-NEWEST");
    // Earliest messages got dropped to fit the budget
    expect(concatenated).not.toContain("SENTINEL-OLDEST");
    // We kept fewer than the full 101 messages
    expect(callArgs.messages.length).toBeLessThan(101);
  });
});
