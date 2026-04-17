import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "@/trigger/utils/youtube";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the value on first success", async () => {
    const fn = vi.fn(async () => "ok");
    const p = withRetry(fn);
    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on a 429 error and succeeds on the second attempt", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValueOnce("ok");

    const p = withRetry(fn, { baseDelayMs: 10 });
    // Advance through the 10ms backoff.
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxAttempts", async () => {
    const fn = vi.fn<() => Promise<string>>().mockImplementation(async () => {
      throw new Error("503 Service Unavailable");
    });

    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    // Suppress the unhandled-rejection warning for the final throw.
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10);
    await expect(p).rejects.toThrow(/503/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn<() => Promise<string>>().mockImplementation(async () => {
      throw new Error("400 Bad Request");
    });

    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    p.catch(() => {});
    await expect(p).rejects.toThrow(/400/);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
