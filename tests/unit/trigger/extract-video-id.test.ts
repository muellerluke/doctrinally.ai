import { describe, it, expect } from "vitest";
import { extractVideoId } from "@/trigger/utils/extract-video-id";

describe("extractVideoId", () => {
  it.each([
    [
      "watch URL",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ],
    ["short URL", "https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    [
      "embed URL",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ],
    [
      "shorts URL",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ],
    // Regression — this URL form broke the prod pipeline (see
    // https://.../live/Eo9-Zmk6Z4w?feature=share). Keep here permanently.
    [
      "live stream URL (regression)",
      "https://youtube.com/live/Eo9-Zmk6Z4w?feature=share",
      "Eo9-Zmk6Z4w",
    ],
    [
      "watch URL with extra query params",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz",
      "dQw4w9WgXcQ",
    ],
  ])("extracts id from %s", (_label, url, expected) => {
    expect(extractVideoId(url)).toBe(expected);
  });

  it.each([
    ["non-youtube URL", "https://vimeo.com/123456789"],
    ["malformed URL", "not-a-url"],
    ["empty string", ""],
    [
      "youtube URL without an id",
      "https://www.youtube.com/watch",
    ],
  ])("returns null for %s", (_label, url) => {
    expect(extractVideoId(url)).toBeNull();
  });
});
