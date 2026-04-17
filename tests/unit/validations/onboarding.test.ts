import { describe, it, expect } from "vitest";
import {
  churchInfoSchema,
  onboardingSchema,
} from "@/lib/validations/onboarding";

describe("churchInfoSchema", () => {
  it("accepts a valid church name + slug", () => {
    expect(
      churchInfoSchema.safeParse({ name: "North Cross", slug: "north-cross" })
        .success
    ).toBe(true);
  });

  it.each([
    ["uppercase letters", "North-Cross"],
    ["starts with hyphen", "-north"],
    ["ends with hyphen", "north-"],
    ["consecutive hyphens", "north--cross"],
    ["spaces", "north cross"],
    ["under-length", "x"],
  ])("rejects slug: %s", (_, slug) => {
    expect(
      churchInfoSchema.safeParse({ name: "Valid Name", slug }).success
    ).toBe(false);
  });

  it("rejects too-long names", () => {
    expect(
      churchInfoSchema.safeParse({ name: "x".repeat(101), slug: "a-b" }).success
    ).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("requires plan to be standard or enterprise", () => {
    expect(
      onboardingSchema.safeParse({
        name: "A",
        slug: "a-b",
        plan: "free",
      }).success
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({
        name: "AB",
        slug: "a-b",
        plan: "enterprise",
      }).success
    ).toBe(true);
  });
});
