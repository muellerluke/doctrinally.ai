import { describe, it, expect } from "vitest";
import {
  MODEL_PRICING,
  priceTokens,
  formatCents,
} from "@/lib/sermons/token-budget";

describe("MODEL_PRICING snapshot", () => {
  it("matches expected pricing (update intentionally when rates change)", () => {
    // Source: https://openai.com/api/pricing — last verified 2026-04-18.
    // Any change here must be accompanied by a comment + dated note in
    // `src/lib/sermons/token-budget.ts`.
    expect(MODEL_PRICING).toMatchInlineSnapshot(`
      {
        "gpt-5.4": {
          "inputPer1M": 300,
          "outputPer1M": 1500,
        },
        "gpt-5.4-mini": {
          "inputPer1M": 25,
          "outputPer1M": 200,
        },
      }
    `);
  });
});

describe("priceTokens", () => {
  it("prices a simple turn on gpt-5.4-mini", () => {
    // 10,000 input + 2,000 output tokens:
    // input = 10000/1M * 25 cents = 0.25 cents
    // output = 2000/1M * 200 cents = 0.4 cents
    // total = 0.65 cents → ceil → 1
    expect(priceTokens("gpt-5.4-mini", 10_000, 2_000)).toBe(1);
  });

  it("prices a large turn", () => {
    // 500k input + 100k output on mini:
    // 500000/1M * 25 = 12.5, 100000/1M * 200 = 20, total = 32.5 → ceil → 33
    expect(priceTokens("gpt-5.4-mini", 500_000, 100_000)).toBe(33);
  });

  it("rounds up fractional cents", () => {
    // Any non-zero usage should cost at least 1 cent.
    expect(priceTokens("gpt-5.4-mini", 1, 1)).toBe(1);
  });

  it("returns 0 for zero tokens", () => {
    expect(priceTokens("gpt-5.4-mini", 0, 0)).toBe(0);
  });

  it("falls back to the default model for unknown names", () => {
    const known = priceTokens("gpt-5.4-mini", 10_000, 2_000);
    const unknown = priceTokens("entirely-fake-model", 10_000, 2_000);
    expect(unknown).toBe(known);
  });
});

describe("formatCents", () => {
  it("formats whole dollars without decimals", () => {
    expect(formatCents(1000)).toBe("$10");
  });

  it("formats partial dollars with two decimals", () => {
    expect(formatCents(312)).toBe("$3.12");
  });

  it("handles zero", () => {
    expect(formatCents(0)).toBe("$0");
  });
});
