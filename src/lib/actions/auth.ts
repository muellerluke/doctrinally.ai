"use server";

import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { signUpSchema, forgotPasswordSchema } from "@/lib/validations/auth";
import { generateToken } from "@/lib/utils";

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    hashedPassword,
  });

  return { success: true };
}

export async function forgotPassword(input: { email: string }) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Always return success to avoid leaking whether an email exists
  if (!user) {
    return { success: true };
  }

  // Delete any existing tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  const rawToken = generateToken();
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

  // TODO: Replace with real email provider (Resend, SendGrid, etc.)
  console.log(`[Password Reset] Link for ${email}: ${resetUrl}`);

  return { success: true };
}

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  if (input.password !== input.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const hashedToken = createHash("sha256").update(input.token).digest("hex");

  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, hashedToken),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  if (!resetToken) {
    return { error: "Invalid or expired reset link" };
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  await db
    .update(users)
    .set({ hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, resetToken.userId));

  // Delete all tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetToken.userId));

  return { success: true };
}
