import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { getTestDb } from "../../helpers/db";
import { makeUser } from "../../helpers/factories";
import { forgotPassword, resetPassword } from "@/lib/actions/auth";
import { sendPasswordResetEmail } from "@/lib/email";

describe("Forgot → reset password flow", () => {
  it("stores a hashed token, emails the raw token, then resets via the raw token", async () => {
    const user = await makeUser({ email: "reset@example.com" });
    const db = getTestDb();

    const forgotResult = await forgotPassword({ email: "reset@example.com" });
    expect(forgotResult).toEqual({ success: true });

    // Email sent with a URL containing the raw token.
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "reset@example.com",
      expect.stringContaining("reset-password?token=")
    );
    const emailArgs = vi.mocked(sendPasswordResetEmail).mock.calls[0];
    const url = emailArgs[1] as string;
    const rawToken = url.split("token=")[1];
    expect(rawToken).toBeTruthy();

    // What's stored in the DB is the SHA-256 hash, never the raw token.
    const expectedHashed = createHash("sha256").update(rawToken).digest("hex");
    const row = await db.query.passwordResetTokens.findFirst({
      where: (t, { eq }) => eq(t.userId, user.id),
    });
    expect(row!.token).toBe(expectedHashed);
    expect(row!.token).not.toBe(rawToken);

    // Reset with the raw token.
    const resetResult = await resetPassword({
      token: rawToken,
      password: "NewStrongPass1",
      confirmPassword: "NewStrongPass1",
    });
    expect(resetResult).toEqual({ success: true });

    // Verify the user's password was re-hashed and the new password works.
    const after = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, user.id),
    });
    expect(await bcrypt.compare("NewStrongPass1", after!.hashedPassword!)).toBe(
      true
    );

    // All tokens for this user should be deleted after a successful reset.
    const remaining = await db.query.passwordResetTokens.findMany({
      where: (t, { eq }) => eq(t.userId, user.id),
    });
    expect(remaining).toHaveLength(0);
  });

  it("returns success even when the email doesn't exist (no user enumeration)", async () => {
    const result = await forgotPassword({ email: "nobody@example.com" });
    expect(result).toEqual({ success: true });
    // No email fired.
    expect(sendPasswordResetEmail).not.toHaveBeenCalledWith(
      "nobody@example.com",
      expect.anything()
    );
  });

  it("rejects reset with an invalid token", async () => {
    const result = await resetPassword({
      token: "totally-bogus-token",
      password: "NewStrongPass1",
      confirmPassword: "NewStrongPass1",
    });
    expect(result).toEqual({ error: "Invalid or expired reset link" });
  });

  it("rejects reset when passwords don't match", async () => {
    const result = await resetPassword({
      token: "x",
      password: "NewStrongPass1",
      confirmPassword: "Different1",
    });
    expect(result).toEqual({ error: "Passwords do not match" });
  });
});
