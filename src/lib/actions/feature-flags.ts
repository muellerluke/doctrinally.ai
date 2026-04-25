"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  isKnownFlagKey,
  setChurchFlag,
  type FeatureFlagKey,
} from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

/**
 * Super-admin server actions for per-church feature-flag overrides.
 *
 * Writes are platform-super-admin only. We intentionally don't expose
 * any read action here — reads go through the cached
 * `isFeatureEnabled` / `getChurchFlags` helpers which are safe to
 * call from anywhere in the app.
 */

export async function toggleChurchFeatureFlag(params: {
  churchId: string;
  flag: string;
  enabled: boolean | null; // null = clear override, return to default
  note?: string | null;
}) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Forbidden" as const };
  if (!isKnownFlagKey(params.flag)) {
    return { error: "Unknown flag key" as const };
  }
  if (!params.churchId) {
    return { error: "Missing churchId" as const };
  }

  await setChurchFlag({
    churchId: params.churchId,
    flag: params.flag as FeatureFlagKey,
    enabled: params.enabled,
    updatedByUserId: session.user.id,
    note: params.note ?? null,
  });

  logger.info("[feature-flags] override changed", {
    churchId: params.churchId,
    flag: params.flag,
    enabled: params.enabled,
    updatedByUserId: session.user.id,
  });

  revalidatePath("/admin/feature-flags");
  revalidatePath("/admin");

  return { success: true as const };
}
