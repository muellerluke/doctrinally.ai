import { randomBytes } from "crypto";

/**
 * Generate a collision-resistant public embed key. This is NOT a secret —
 * it ships in every page source that embeds the widget — so we just need
 * enough entropy to prevent guessing. `dai_pk_` prefix makes keys
 * recognizable in logs and tooling.
 *
 * Lives in its own module (not `lib/actions/embed.ts`) because that file
 * is a `"use server"` Server Actions module, and Server Action files can
 * only export async functions. Auto-provisioning in onboarding and the
 * one-off backfill script both import from here.
 */
export function generateEmbedKey(): string {
  return `dai_pk_${randomBytes(18).toString("base64url")}`;
}
