import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { churchFeatureFlags } from "@/db/schema";
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  isKnownFlagKey,
  type FeatureFlagKey,
} from "./flags";

/**
 * Runtime helpers for reading feature-flag state.
 *
 * All reads go through an in-memory cache keyed by `churchId` because
 * the flag check fires on hot paths (every widget request, every
 * admin page render). The cache stores the full flag map per church
 * so we do at most one DB round-trip per church per TTL window.
 *
 * Invalidation model: writes from the super-admin UI call
 * `invalidateChurchFlagCache(churchId)` so rollout changes take
 * effect within the same request. The TTL (30 s) is the upper bound
 * if the cache entry falls out across instance boundaries on Vercel
 * — a 30-s flag propagation delay is acceptable for a manual tool.
 *
 * No negative caching — "flag not set" is a normal response and
 * still counted toward the positive cache entry.
 */

export { FEATURE_FLAGS, FEATURE_FLAG_KEYS } from "./flags";
export type { FeatureFlagKey, FeatureFlagDefinition } from "./flags";

const CACHE_TTL_MS = 30 * 1000;

interface CachedChurchFlags {
  flags: Record<string, boolean>;
  fetchedAt: number;
}

const CACHE = new Map<string, CachedChurchFlags>();

async function loadChurchFlags(
  churchId: string
): Promise<Record<string, boolean>> {
  const rows = await db
    .select({
      key: churchFeatureFlags.flagKey,
      enabled: churchFeatureFlags.enabled,
    })
    .from(churchFeatureFlags)
    .where(eq(churchFeatureFlags.churchId, churchId));

  const flags: Record<string, boolean> = {};
  for (const row of rows) flags[row.key] = row.enabled;
  return flags;
}

async function getCached(churchId: string): Promise<Record<string, boolean>> {
  const cached = CACHE.get(churchId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.flags;
  }
  const flags = await loadChurchFlags(churchId);
  CACHE.set(churchId, { flags, fetchedAt: Date.now() });
  return flags;
}

/**
 * True when the flag is enabled for the given church. Resolves the
 * per-church override if set; otherwise falls back to the flag's
 * registered default.
 */
export async function isFeatureEnabled(
  churchId: string,
  flag: FeatureFlagKey
): Promise<boolean> {
  const defn = FEATURE_FLAGS[flag];
  const overrides = await getCached(churchId);
  if (flag in overrides) return overrides[flag];
  return defn.default;
}

/**
 * Resolve every flag for a church at once. Use when you already know
 * you'll check more than one flag on the same request — cheaper than
 * N separate `isFeatureEnabled` calls because the first call
 * populates the cache anyway.
 */
export async function getChurchFlags(
  churchId: string
): Promise<Record<FeatureFlagKey, boolean>> {
  const overrides = await getCached(churchId);
  const resolved = {} as Record<FeatureFlagKey, boolean>;
  for (const key of FEATURE_FLAG_KEYS) {
    resolved[key] = key in overrides ? overrides[key] : FEATURE_FLAGS[key].default;
  }
  return resolved;
}

/**
 * Return the raw per-church overrides (no fallback merged in). Used
 * by the super-admin UI to distinguish "default" from "explicitly
 * set to default-value" — useful for showing which churches have an
 * override in the matrix view.
 */
export async function getChurchFlagOverrides(
  churchId: string
): Promise<Record<string, boolean>> {
  return { ...(await getCached(churchId)) };
}

export function invalidateChurchFlagCache(churchId: string): void {
  CACHE.delete(churchId);
}

export function invalidateAllFlagCache(): void {
  CACHE.clear();
}

/**
 * Bulk-load overrides for every church. Drives the super-admin
 * rollout matrix. Returns `Map<churchId, Record<flagKey, boolean>>`.
 * Does NOT update the per-church cache — this is a one-shot admin
 * query that would blow the cache if we blindly wrote every result.
 */
export async function loadAllOverrides(): Promise<
  Map<string, Record<string, boolean>>
> {
  const rows = await db
    .select({
      churchId: churchFeatureFlags.churchId,
      key: churchFeatureFlags.flagKey,
      enabled: churchFeatureFlags.enabled,
    })
    .from(churchFeatureFlags);
  const out = new Map<string, Record<string, boolean>>();
  for (const row of rows) {
    const existing = out.get(row.churchId) ?? {};
    if (isKnownFlagKey(row.key)) existing[row.key] = row.enabled;
    out.set(row.churchId, existing);
  }
  return out;
}

/**
 * Guard for narrow call-sites that read a flag key from an
 * untrusted source (URL param, form field). Prevents arbitrary
 * strings from reaching the DB.
 */
export { isKnownFlagKey } from "./flags";

/**
 * Set or clear a per-church override. Pass `enabled = null` to
 * delete the override (return to default). All writes invalidate the
 * cache for that church on the same instance; other instances will
 * converge within the TTL window.
 *
 * The super-admin auth check lives in the server-action wrapper in
 * `src/lib/actions/feature-flags.ts` — this lower-level helper
 * trusts its caller, so it can also be used from internal scripts
 * that have already checked permission differently (e.g. a CLI).
 */
export async function setChurchFlag({
  churchId,
  flag,
  enabled,
  updatedByUserId,
  note,
}: {
  churchId: string;
  flag: FeatureFlagKey;
  enabled: boolean | null;
  updatedByUserId?: string | null;
  note?: string | null;
}): Promise<void> {
  if (enabled === null) {
    await db
      .delete(churchFeatureFlags)
      .where(
        and(
          eq(churchFeatureFlags.churchId, churchId),
          eq(churchFeatureFlags.flagKey, flag)
        )
      );
  } else {
    await db
      .insert(churchFeatureFlags)
      .values({
        churchId,
        flagKey: flag,
        enabled,
        updatedByUserId: updatedByUserId ?? null,
        note: note ?? null,
      })
      .onConflictDoUpdate({
        target: [churchFeatureFlags.churchId, churchFeatureFlags.flagKey],
        set: {
          enabled,
          updatedByUserId: updatedByUserId ?? null,
          note: note ?? null,
          updatedAt: new Date(),
        },
      });
  }
  invalidateChurchFlagCache(churchId);
}
