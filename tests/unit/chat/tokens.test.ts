import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateMessageTokens,
  trimHistoryToBudget,
} from "@/lib/chat/tokens";

describe("estimateTokens", () => {
  it("returns 0 for empty/null/undefined input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens("   ")).toBe(0);
  });

  it("roughly tracks 1.3 tokens per word", () => {
    // 10 words → 13 tokens
    expect(estimateTokens("one two three four five six seven eight nine ten")).toBe(
      13
    );
  });

  it("is deterministic for the same input", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    expect(estimateTokens(text)).toBe(estimateTokens(text));
  });
});

describe("estimateMessageTokens", () => {
  it("adds role overhead (~3 tokens) on top of content", () => {
    const user = { role: "user" as const, content: "hi there" };
    expect(estimateMessageTokens(user)).toBe(3 + estimateTokens("hi there"));
  });

  it("handles empty content with only role overhead", () => {
    const m = { role: "assistant" as const, content: "" };
    expect(estimateMessageTokens(m)).toBe(3);
  });
});

describe("trimHistoryToBudget", () => {
  const fixedOpts = {
    systemPromptTokens: 1000,
    ragContextTokens: 500,
    currentUserTokens: 50,
    totalBudget: 5000,
    outputReserve: 1000,
    toolOverheadTokens: 0,
  };

  it("returns empty array when fixed cost already exceeds budget", () => {
    const result = trimHistoryToBudget(
      [{ role: "user", content: "old message" }],
      { ...fixedOpts, totalBudget: 100 }
    );
    expect(result).toEqual([]);
  });

  it("keeps all messages when plenty of budget remains", () => {
    const history = [
      { role: "user" as const, content: "one two three" },
      { role: "assistant" as const, content: "four five six" },
    ];
    const result = trimHistoryToBudget(history, fixedOpts);
    expect(result).toEqual(history);
  });

  it("walks newest-first, keeping tail until next message wouldn't fit", () => {
    // 100-word message = 130 tokens + 3 overhead = 133 each
    const bigContent = Array(100).fill("word").join(" ");
    const history = [
      { role: "user" as const, content: "old-" + bigContent },
      { role: "assistant" as const, content: "mid-" + bigContent },
      { role: "user" as const, content: "new-" + bigContent },
    ];
    // fixed = 1000 + 500 + 50 + 1000 = 2550. remaining = 5000 - 2550 = 2450.
    // Each msg = ~134 tokens. 2450 / 134 ≈ 18, so all three fit.
    const allFit = trimHistoryToBudget(history, fixedOpts);
    expect(allFit).toHaveLength(3);

    // Tight budget where only the last two fit
    const tightFit = trimHistoryToBudget(history, {
      ...fixedOpts,
      totalBudget: 2550 + 270, // room for 2 messages (~268 tokens), not 3
    });
    expect(tightFit).toHaveLength(2);
    expect(tightFit[0].content.startsWith("mid-")).toBe(true);
    expect(tightFit[1].content.startsWith("new-")).toBe(true);
  });

  it("drops messages that individually exceed remaining budget", () => {
    // A single giant message won't fit
    const giant = Array(10_000).fill("word").join(" "); // ~13000 tokens
    const history = [
      { role: "user" as const, content: giant },
      { role: "assistant" as const, content: "small reply" },
    ];
    const result = trimHistoryToBudget(history, fixedOpts);
    // The giant message stops inclusion — small reply fits, giant doesn't
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("small reply");
  });

  it("handles empty history", () => {
    expect(trimHistoryToBudget([], fixedOpts)).toEqual([]);
  });

  it("defaults totalBudget to 100k and outputReserve to 4k", () => {
    // A single 10-token message should be kept under default budget
    const history = [{ role: "user" as const, content: "hello there" }];
    const result = trimHistoryToBudget(history, {
      systemPromptTokens: 1500,
      ragContextTokens: 2000,
      currentUserTokens: 20,
    });
    expect(result).toEqual(history);
  });
});
