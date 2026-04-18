import { describe, it, expect } from "vitest";
import {
  splitCitationSegments,
  stripCitationTags,
} from "@/lib/citations/parse";
import type { Citation } from "@/lib/types/citations";

const cit = (docId: string, title = "Doc"): Citation => ({
  index: 1,
  documentId: docId,
  documentTitle: title,
  documentType: "platejs",
  chunkContent: "",
});

describe("splitCitationSegments", () => {
  it("returns a single text segment when no tags present", () => {
    const segs = splitCitationSegments("plain text", []);
    expect(segs).toEqual([{ kind: "text", value: "plain text" }]);
  });

  it("splits text around a single document tag", () => {
    const segs = splitCitationSegments(
      "before <document>abc</document> after",
      [cit("abc")]
    );
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: "text", value: "before " });
    expect(segs[1].kind).toBe("embed");
    expect(segs[2]).toEqual({ kind: "text", value: " after" });
  });

  it("drops tags whose doc id has no matching citation", () => {
    const segs = splitCitationSegments(
      "a <document>missing</document> b",
      []
    );
    const embeds = segs.filter((s) => s.kind === "embed");
    expect(embeds).toHaveLength(0);
  });

  it("handles multiple tags in sequence", () => {
    const segs = splitCitationSegments(
      "<document>one</document> and <document>two</document>",
      [cit("one"), cit("two")]
    );
    const embeds = segs.filter((s) => s.kind === "embed");
    expect(embeds).toHaveLength(2);
  });

  it("trims whitespace inside the tag", () => {
    const segs = splitCitationSegments(
      "<document>  abc  </document>",
      [cit("abc")]
    );
    const embed = segs.find((s) => s.kind === "embed");
    expect(embed?.kind).toBe("embed");
  });
});

describe("stripCitationTags", () => {
  it("removes tags entirely", () => {
    expect(stripCitationTags("a <document>x</document> b")).toBe("a  b");
  });
  it("is a no-op on tagless text", () => {
    expect(stripCitationTags("plain")).toBe("plain");
  });
});
