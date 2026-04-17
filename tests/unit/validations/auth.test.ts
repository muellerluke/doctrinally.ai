import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("signUpSchema", () => {
  const valid = { name: "Jane", email: "jane@example.com", password: "Abcdefg1" };

  it("accepts a valid payload", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["missing lowercase", "ABCDEFG1"],
    ["missing uppercase", "abcdefg1"],
    ["missing digit", "Abcdefgh"],
    ["too short", "Ab1"],
  ])("rejects password: %s", (_, password) => {
    const result = signUpSchema.safeParse({ ...valid, password });
    expect(result.success).toBe(false);
  });

  it("rejects a 1-character name", () => {
    expect(signUpSchema.safeParse({ ...valid, name: "J" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(
      false
    );
  });
});

describe("signInSchema", () => {
  it("requires email + password", () => {
    expect(signInSchema.safeParse({ email: "x@y.com", password: "x" }).success).toBe(
      true
    );
    expect(signInSchema.safeParse({ email: "x@y.com", password: "" }).success).toBe(
      false
    );
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const base = {
    token: "raw-token",
    password: "Abcdefg1",
    confirmPassword: "Abcdefg1",
  };

  it("accepts matching passwords", () => {
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords with the confirmPassword path", () => {
    const result = resetPasswordSchema.safeParse({
      ...base,
      confirmPassword: "Different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("confirmPassword")
      );
      expect(issue?.message).toBe("Passwords do not match");
    }
  });

  it("requires a non-empty token", () => {
    expect(resetPasswordSchema.safeParse({ ...base, token: "" }).success).toBe(
      false
    );
  });
});
