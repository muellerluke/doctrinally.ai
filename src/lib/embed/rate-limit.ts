import { sql } from "drizzle-orm";
import { db } from "@/db";
import { embedRateCounters } from "@/db/schema/embed-rate-counters";
import { embedChurchChatCounters } from "@/db/schema/embed-church-chat-counters";

/**
 * Two-tier rate limiting for the embedded widget.
 *
 * TIER 1 — In-memory token bucket. Fast path: reject obvious abuse
 * without touching the DB. On Vercel's Node runtime each lambda
 * instance has its own Map, so this defense is "per warm instance."
 * Good enough to block a single bad actor hitting one warm worker;
 * not sufficient on its own for distributed abuse.
 *
 * TIER 2 — Postgres upsert counter. Authoritative per-hour cap via
 * `INSERT … ON CONFLICT … DO UPDATE RETURNING count`. One round-trip,
 * multi-region correct. Sits in front of the model call so we never
 * pay for inference when the cap is already busted.
 *
 * Both tiers log to the same action names so telemetry stays
 * consistent.
 */

// ───────── Tier 1: in-memory token bucket ─────────

interface Bucket {
  tokens: number;
  refilledAt: number;
}

interface BucketPolicy {
  capacity: number;
  refillPerSec: number;
}

const BUCKETS = new Map<string, Bucket>();
const MAX_ENTRIES = 10_000; // rough cap so a runaway attack can't eat RAM

/**
 * Policies keyed by "kind". Kept in one place so tuning is a single
 * diff instead of a sweep across endpoints.
 */
export const POLICIES = {
  // Per-IP caps on the lightweight config fetch — high because the
  // church's own pages legitimately call this on every page load.
  "config:ip": { capacity: 60, refillPerSec: 60 / 60 },
  // Per-session chat message flow. 10 in a minute is already pushing
  // "human typing fast" territory; anything above is scripted.
  "chat:session": { capacity: 10, refillPerSec: 10 / 60 },
  // Per-church global message flow. Safety net for a viral page
  // driving thousands of concurrent sessions.
  "chat:church": { capacity: 600, refillPerSec: 600 / 60 },
  // Outreach per-church caps. Matches the plan's 50/hour soft cap.
  "outreach:church": { capacity: 50, refillPerSec: 50 / 3600 },
  // Prospect capture is intentionally tiny — one per session over a
  // long window is the legitimate pattern.
  "prospect:session": { capacity: 3, refillPerSec: 3 / 3600 },
} as const satisfies Record<string, BucketPolicy>;

type PolicyKey = keyof typeof POLICIES;

function bucketKey(kind: PolicyKey, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Consume 1 token from the bucket. Returns true if allowed, false if
 * starved. Lazy refills on access so we don't need a background timer.
 */
export function consumeToken(kind: PolicyKey, id: string): boolean {
  const now = Date.now();
  const key = bucketKey(kind, id);
  const policy = POLICIES[kind];

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens: policy.capacity, refilledAt: now };
  } else {
    const elapsedSec = (now - bucket.refilledAt) / 1000;
    const refill = elapsedSec * policy.refillPerSec;
    bucket.tokens = Math.min(policy.capacity, bucket.tokens + refill);
    bucket.refilledAt = now;
  }

  // Lazy eviction: if we've hit the hard entry cap, drop the oldest
  // entry. O(n) but only runs under sustained abuse — the normal
  // steady state keeps us well under MAX_ENTRIES.
  if (!BUCKETS.has(key) && BUCKETS.size >= MAX_ENTRIES) {
    const oldest = [...BUCKETS.entries()].sort(
      (a, b) => a[1].refilledAt - b[1].refilledAt
    )[0];
    if (oldest) BUCKETS.delete(oldest[0]);
  }

  if (bucket.tokens < 1) {
    BUCKETS.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  BUCKETS.set(key, bucket);
  return true;
}

// ───────── Tier 2: Postgres upsert counter ─────────

/**
 * Increment the per-session, per-hour counter and return the new count.
 * Reject messages once `count > hardCapPerHour` at the call site.
 */
export async function incrementAndCheckHardCap({
  sessionId,
  hardCapPerHour,
}: {
  sessionId: string;
  hardCapPerHour: number;
}): Promise<{ ok: boolean; count: number }> {
  const now = new Date();
  const hourBucket = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );

  const [row] = await db
    .insert(embedRateCounters)
    .values({ sessionId, hourBucket, count: 1 })
    .onConflictDoUpdate({
      target: [embedRateCounters.sessionId, embedRateCounters.hourBucket],
      set: { count: sql`${embedRateCounters.count} + 1` },
    })
    .returning({ count: embedRateCounters.count });

  const count = row?.count ?? 0;
  return { ok: count <= hardCapPerHour, count };
}

// ───────── Tier 3: per-church hourly chat cap (anomaly v1) ─────────

/**
 * Authoritative per-church-per-hour chat cap. Distinct from the
 * per-session cap above — that one defends a single visitor against
 * runaway behavior, this one defends the whole church against the
 * "burn through the monthly message budget in 30 minutes via many
 * sessions" denial-of-service vector.
 *
 * Default 200 messages/hour/church. A real church doesn't approach
 * this — it's set well above legitimate traffic, well below the
 * "destroy the budget in an evening" attack rate. Sustained max
 * abuse stretches a 1500-message Standard budget to 7-8 hours
 * (vs. ~30 min uncapped) and a 3000-message Enterprise to ~15.
 *
 * Once the cap hits, /api/embed/chat returns 429 for the rest of
 * the hour. The MEMBER chat is unaffected — it has its own monthly
 * limit but no per-hour cap, since it's already gated behind the
 * subdomain login flow.
 */
export const CHURCH_CHAT_HARD_CAP_PER_HOUR = 200;

export async function incrementAndCheckChurchHourlyChatCap({
  churchId,
  hardCap = CHURCH_CHAT_HARD_CAP_PER_HOUR,
}: {
  churchId: string;
  hardCap?: number;
}): Promise<{ ok: boolean; count: number; limit: number }> {
  const now = new Date();
  const hourBucket = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const [row] = await db
    .insert(embedChurchChatCounters)
    .values({ churchId, hourBucket, count: 1 })
    .onConflictDoUpdate({
      target: [
        embedChurchChatCounters.churchId,
        embedChurchChatCounters.hourBucket,
      ],
      set: { count: sql`${embedChurchChatCounters.count} + 1` },
    })
    .returning({ count: embedChurchChatCounters.count });
  const count = row?.count ?? 0;
  return { ok: count <= hardCap, count, limit: hardCap };
}
