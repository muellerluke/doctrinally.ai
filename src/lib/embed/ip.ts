import { createHash } from "crypto";
import { sql, and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  embedWidgetSessions,
  embedIpSessionCounters,
  embedSessionIps,
} from "@/db/schema";

/**
 * IP-based abuse defenses for the embedded widget.
 *
 * Two complementary checks:
 *
 *   1. SESSION-IP BINDING — `verifyAndUpdateSessionIp(...)`
 *      Each session can be used from at most MAX_IPS_PER_SESSION
 *      distinct IPs over its 30-day lifetime. Tolerates legitimate
 *      roaming (wifi ↔ cellular ↔ another wifi). Caps token theft —
 *      a stolen token used from a 4th IP is rejected.
 *
 *   2. PER-IP DAILY SESSION CAP — `incrementAndCheckDailySessionLimit(...)`
 *      Each IP can mint at most MAX_SESSIONS_PER_IP_PER_DAY fresh
 *      widget sessions per UTC day. Tolerates shared computers
 *      (library, coffee shop) while making prospect spam expensive
 *      — submitting 1000 fake prospects requires 200+ IPs.
 *
 * Neither check uses the raw IP — only `sha256(normalizedIp)`.
 * Storing the hash keeps the PII surface minimal: we can't recover
 * the IP from the hash, but we can recognize the same IP returning.
 */

export const MAX_IPS_PER_SESSION = 3;
export const MAX_SESSIONS_PER_IP_PER_DAY = 25;

// IPv6 prefix length we hash. /48 is the standard end-site allocation
// — every device in a typical residential or small-business IPv6
// deployment shares the same /48. Hashing only the prefix means an
// attacker can't trivially defeat the daily cap by walking the /64
// they were assigned (16 quintillion addresses for free per device).
//
// Tradeoff: a residential household with IPv6 shares the daily cap.
// 25 sessions/day across a household is still plenty for legitimate
// use — far more than the 5 we shipped with originally.
const IPV6_PREFIX_BITS = 48;

/**
 * Pull the requesting IP from a Next.js Request. Vercel sets
 * `x-forwarded-for` (comma-separated client → proxy chain) and
 * `x-real-ip`; we prefer the first IP in `x-forwarded-for`. Falls
 * back to a sentinel so the hash function still has something to
 * work with — never throw here, the calling routes already gate on
 * other auth signals.
 */
export function getRequestIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }
  const real = request.headers.get("x-real-ip");
  if (real) return normalizeIp(real.trim());
  return "unknown";
}

/**
 * Normalize the IP form before hashing so trivial variants
 * (capitalized hex, IPv4-mapped IPv6) hash to the same value, and
 * truncate IPv6 to its /48 prefix so attackers can't rotate freely
 * through the `/64` (16 quintillion addresses) every device gets
 * for free. IPv4 keeps full /32 — the address space is small
 * enough that exhaustion is itself a meaningful cost.
 */
function normalizeIp(ip: string): string {
  let v = ip.toLowerCase().trim();
  // Strip optional brackets from IPv6 in `[addr]:port` form.
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end > 0) v = v.slice(1, end);
  }
  // IPv4-mapped IPv6 → treat as IPv4 so dual-stack devices don't
  // burn two slots.
  if (v.startsWith("::ffff:")) v = v.slice(7);
  // IPv6 detection: any colon = IPv6 at this point (we stripped the
  // mapped prefix and the brackets above; an IPv4 address has no
  // colons). Truncate to the /48 prefix.
  if (v.includes(":")) {
    return ipv6Prefix(v, IPV6_PREFIX_BITS);
  }
  return v;
}

/**
 * Truncate an IPv6 address to a network prefix of `bits` bits and
 * return a canonical lowercase string. We expand `::` to its full
 * 8-group form first so the truncation is unambiguous.
 *
 * Returns the original (lowercased, trimmed) input if parsing fails
 * — the request still gets a stable hash, just at full address
 * granularity. We'd rather over-cap a malformed input than crash.
 */
function ipv6Prefix(addr: string, bits: number): string {
  try {
    // Strip zone id (e.g. `fe80::1%eth0`) — irrelevant for hashing.
    const noZone = addr.split("%")[0];
    // Expand "::" to fill the missing groups.
    let expanded: string[];
    if (noZone.includes("::")) {
      const [left, right] = noZone.split("::", 2);
      const leftGroups = left ? left.split(":") : [];
      const rightGroups = right ? right.split(":") : [];
      const missing = 8 - leftGroups.length - rightGroups.length;
      if (missing < 0) return noZone; // malformed
      const middle = Array(missing).fill("0");
      expanded = [...leftGroups, ...middle, ...rightGroups];
    } else {
      expanded = noZone.split(":");
    }
    if (expanded.length !== 8) return noZone;
    const padded = expanded.map((g) => g.padStart(4, "0"));
    // Build a 128-bit binary string, take the first `bits` bits,
    // pad to nibble boundary, render back as `:`-grouped hex.
    const bin = padded
      .map((g) => parseInt(g, 16).toString(2).padStart(16, "0"))
      .join("");
    const truncatedBin = bin.slice(0, bits).padEnd(128, "0");
    const hexGroups: string[] = [];
    for (let i = 0; i < 128; i += 16) {
      const group = truncatedBin.slice(i, i + 16);
      hexGroups.push(parseInt(group, 2).toString(16));
    }
    // Canonicalize: collapse longest run of zero groups to "::". For
    // hashing stability we just emit non-collapsed lowercase, since
    // we control both ends of the comparison.
    return hexGroups.join(":") + `/${bits}`;
  } catch {
    return addr;
  }
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(normalizeIp(ip)).digest("hex");
}

// ────────────────────────────────────────────────────────────────
// Layer 1 — session-IP binding
// ────────────────────────────────────────────────────────────────

interface IpVerifyOk {
  ok: true;
  added: boolean; // true if this is a new IP for the session
}
interface IpVerifyDenied {
  ok: false;
  reason: "ip_limit_exceeded";
  ipsUsed: number;
}

export type IpVerifyResult = IpVerifyOk | IpVerifyDenied;

/**
 * Verify the request's IP against the session's IP set, updating
 * `lastSeenAt` if it's known or appending if it's new-but-allowed.
 *
 * Backed by `embed_session_ips` — a dedicated table so each refresh
 * is a single-row write rather than rewriting the entire metadata
 * JSONB blob on `embed_widget_sessions`.
 *
 * The 60-second `lastSeenAt` debounce is preserved — a busy session
 * still doesn't spam writes from the same IP.
 *
 * Returns `{ ok: true }` when the request's IP is allowed and
 * `{ ok: false, reason: "ip_limit_exceeded" }` when the session has
 * already seen MAX_IPS_PER_SESSION distinct IPs and this isn't one
 * of them.
 */
export async function verifyAndUpdateSessionIp({
  sessionId,
  ipHash,
}: {
  sessionId: string;
  ipHash: string;
}): Promise<IpVerifyResult> {
  // Fast path: known IP. One indexed lookup + an optional cheap
  // update. The composite PK on (sessionId, ipHash) makes this O(log n)
  // on a tiny n.
  const existing = await db
    .select({
      lastSeenAt: embedSessionIps.lastSeenAt,
    })
    .from(embedSessionIps)
    .where(
      and(
        eq(embedSessionIps.sessionId, sessionId),
        eq(embedSessionIps.ipHash, ipHash)
      )
    )
    .limit(1);

  if (existing[0]) {
    const last = existing[0].lastSeenAt.getTime();
    if (Date.now() - last < 60_000) {
      // Recently seen — skip the write to avoid hammering the row
      // on a chatty session.
      return { ok: true, added: false };
    }
    await db
      .update(embedSessionIps)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(embedSessionIps.sessionId, sessionId),
          eq(embedSessionIps.ipHash, ipHash)
        )
      );
    return { ok: true, added: false };
  }

  // New IP for this session. Count existing distinct IPs and reject
  // if at the cap. Race-tolerant — if two requests both pass the
  // count check and try to insert, the unique PK guarantees at most
  // MAX_IPS_PER_SESSION + 1 ever land. We accept that off-by-one
  // for the simplicity vs. a serializable transaction.
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(embedSessionIps)
    .where(eq(embedSessionIps.sessionId, sessionId));
  const ipsUsed = countRow?.count ?? 0;
  if (ipsUsed >= MAX_IPS_PER_SESSION) {
    return { ok: false, reason: "ip_limit_exceeded", ipsUsed };
  }

  // Insert. ON CONFLICT no-op handles the race where two concurrent
  // requests both decide to insert the same new IP.
  await db
    .insert(embedSessionIps)
    .values({ sessionId, ipHash })
    .onConflictDoNothing({
      target: [embedSessionIps.sessionId, embedSessionIps.ipHash],
    });

  // Bump the session's lastSeenAt so the row remains fresh for
  // periodic-cleanup queries that look for stale sessions.
  await db
    .update(embedWidgetSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(embedWidgetSessions.id, sessionId));

  return { ok: true, added: true };
}

/**
 * Insert the very first IP for a freshly-created session. Called
 * by `/api/embed/session` POST so subsequent requests can compare
 * against it.
 */
export async function seedSessionIp({
  sessionId,
  ipHash,
}: {
  sessionId: string;
  ipHash: string;
}): Promise<void> {
  await db
    .insert(embedSessionIps)
    .values({ sessionId, ipHash })
    .onConflictDoNothing({
      target: [embedSessionIps.sessionId, embedSessionIps.ipHash],
    });
}

// ────────────────────────────────────────────────────────────────
// Layer 2 — per-IP daily session-creation cap
// ────────────────────────────────────────────────────────────────

interface DailyCapResult {
  ok: boolean;
  count: number;
  limit: number;
}

/**
 * Increment the per-IP, per-UTC-day session-creation counter and
 * return whether we're still under the cap. ON CONFLICT DO UPDATE
 * gives us the new count atomically — no race between read and
 * write across concurrent session-create requests.
 *
 * Call this BEFORE inserting the session row. If it returns ok:
 * false, refuse session creation (429). The counter still
 * increments on a refused request — that's intentional, repeated
 * over-cap attempts shouldn't reset the cap.
 */
export async function incrementAndCheckDailySessionLimit({
  ipHash,
  limit = MAX_SESSIONS_PER_IP_PER_DAY,
}: {
  ipHash: string;
  limit?: number;
}): Promise<DailyCapResult> {
  // YYYY-MM-DD in UTC. Day boundaries are global so a US-West
  // attacker rotating through 5 sessions at 11:59 PM UTC still
  // gets capped at 5 in the same calendar day.
  const dayBucket = new Date().toISOString().slice(0, 10);

  const [row] = await db
    .insert(embedIpSessionCounters)
    .values({ ipHash, dayBucket, count: 1 })
    .onConflictDoUpdate({
      target: [
        embedIpSessionCounters.ipHash,
        embedIpSessionCounters.dayBucket,
      ],
      set: { count: sql`${embedIpSessionCounters.count} + 1` },
    })
    .returning({ count: embedIpSessionCounters.count });

  const count = row?.count ?? 0;
  return { ok: count <= limit, count, limit };
}

/**
 * Read-only lookup of the day's count for an IP. Useful for
 * diagnostics or admin tooling — not used in the request path.
 */
export async function getDailySessionCount(ipHash: string): Promise<number> {
  const dayBucket = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({ count: embedIpSessionCounters.count })
    .from(embedIpSessionCounters)
    .where(
      and(
        eq(embedIpSessionCounters.ipHash, ipHash),
        eq(embedIpSessionCounters.dayBucket, dayBucket)
      )
    );
  return row?.count ?? 0;
}
