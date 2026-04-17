import { describe, it, expect } from "vitest";
import {
  youtubeUploadSchema,
  fileUploadSchema,
  platejsDocumentSchema,
} from "@/lib/validations/documents";

describe("youtubeUploadSchema", () => {
  it.each([
    "https://www.youtube.com/watch?v=abc12345678",
    "https://youtu.be/abc12345678",
    "https://youtube.com/live/abc12345678",
  ])("accepts valid YouTube URL: %s", (url) => {
    expect(
      youtubeUploadSchema.safeParse({
        title: "Sermon",
        sourceUrl: url,
      }).success
    ).toBe(true);
  });

  it("rejects non-YouTube URLs", () => {
    expect(
      youtubeUploadSchema.safeParse({
        title: "Sermon",
        sourceUrl: "https://vimeo.com/123",
      }).success
    ).toBe(false);
  });

  it("rejects invalid folderId UUID", () => {
    expect(
      youtubeUploadSchema.safeParse({
        title: "Sermon",
        sourceUrl: "https://youtube.com/watch?v=abcdefghijk",
        folderId: "not-a-uuid",
      }).success
    ).toBe(false);
  });
});

describe("fileUploadSchema", () => {
  it("accepts pdf/word/video types", () => {
    for (const type of ["pdf", "word", "video"] as const) {
      expect(
        fileUploadSchema.safeParse({ title: "Doc", type }).success
      ).toBe(true);
    }
  });

  it("rejects youtube/platejs types (those use different schemas)", () => {
    expect(
      fileUploadSchema.safeParse({ title: "Doc", type: "youtube" }).success
    ).toBe(false);
  });
});

describe("platejsDocumentSchema", () => {
  it("defaults content to empty string when omitted", () => {
    const result = platejsDocumentSchema.safeParse({ title: "Draft" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toBe("");
  });
});
