import { vi } from "vitest";

// ─── Stripe ────────────────────────────────────────────────────────────
//
// Each Stripe method we call in prod maps to a vi.fn here. Tests assert on
// `mockStripe.checkout.sessions.create.mock.calls[0][0]`, or override the
// return value per-test with `.mockResolvedValueOnce()`.
export const mockStripe = {
  customers: {
    create: vi.fn(async (args: Stripe.CustomerCreateParams) => ({
      id: `cus_test_${Date.now()}`,
      email: args.email,
      metadata: args.metadata,
    })),
  },
  checkout: {
    sessions: {
      create: vi.fn(async () => ({
        id: `cs_test_${Date.now()}`,
        url: "https://checkout.stripe.test/session",
      })),
      retrieve: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(async () => ({
        id: `bps_test_${Date.now()}`,
        url: "https://billing.stripe.test/session",
      })),
    },
  },
  invoiceItems: {
    create: vi.fn(async () => ({ id: `ii_test_${Date.now()}` })),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// ─── Resend / email ────────────────────────────────────────────────────
export const mockSendPasswordResetEmail = vi.fn(async () => ({ ok: true }));
export const mockSendInvitationEmail = vi.fn(async () => ({ ok: true }));

// ─── Trigger.dev ───────────────────────────────────────────────────────
export const mockTriggerHandle = { id: "run_test" };
export const mockTasksTrigger = vi.fn(async () => mockTriggerHandle);

// ─── Vercel Blob ───────────────────────────────────────────────────────
const blobStore = new Map<string, { content: string | Uint8Array; url: string }>();
export const mockBlobPut = vi.fn(
  async (pathname: string, body: string | Uint8Array) => {
    const url = `https://blob.test/${pathname}`;
    blobStore.set(pathname, { content: body, url });
    return { pathname, url, size: 0, uploadedAt: new Date() };
  }
);
export const mockBlobDel = vi.fn(async (urls: string | string[]) => {
  const list = Array.isArray(urls) ? urls : [urls];
  for (const url of list) {
    for (const [p, entry] of blobStore) {
      if (entry.url === url) blobStore.delete(p);
    }
  }
});
export const resetBlobStore = () => blobStore.clear();

// ─── OpenAI embeddings (deterministic fixture) ─────────────────────────
//
// Produce a stable 1536-dim vector per input string so semantic search
// tests are reproducible. Not mathematically embeddings — just a hash-based
// seed into a unit vector.
export function fakeEmbedding(text: string, dim = 1536): number[] {
  const out = new Array(dim).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < dim; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    out[i] = ((h >>> 0) / 0xffffffff) * 2 - 1;
  }
  // Normalize to unit length.
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
  return out.map((v) => v / norm);
}

export function resetAllMocks() {
  vi.clearAllMocks();
  resetBlobStore();
}

// Type import only — Stripe ships heavy types but this is just a local
// alias so the mock signatures stay consistent with prod code.
import type Stripe from "stripe";
