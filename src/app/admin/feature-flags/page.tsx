import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  loadAllOverrides,
} from "@/lib/feature-flags";
import {
  FeatureFlagMatrix,
  type ChurchRow,
} from "@/components/super-admin/feature-flag-matrix";

export const metadata = {
  title: "Feature flags — Doctrinally.AI super-admin",
};

/**
 * Super-admin feature-flag rollout matrix.
 *
 * Lists every church with a column for every registered flag. Each
 * cell shows effective state (override > default) and lets the
 * super-admin toggle or reset. Adding a flag elsewhere in the app
 * (via the registry in `src/lib/feature-flags/flags.ts`) automatically
 * surfaces a new column here — no extra UI wiring needed.
 */
export default async function FeatureFlagsAdminPage() {
  // Two cheap queries + a client-side join — easier to read than
  // drizzle's callback-style joins and same net cost (churches + subs
  // are both small tables).
  const [rows, subs] = await Promise.all([
    db
      .select({
        id: churches.id,
        name: churches.name,
        slug: churches.slug,
        isActive: churches.isActive,
        createdAt: churches.createdAt,
      })
      .from(churches)
      .orderBy(desc(churches.createdAt)),
    db
      .select({
        churchId: subscriptions.churchId,
        plan: subscriptions.plan,
        status: subscriptions.status,
      })
      .from(subscriptions),
  ]);
  const subByChurch = new Map(subs.map((s) => [s.churchId, s]));

  const overridesByChurch = await loadAllOverrides();

  const churchRows: ChurchRow[] = rows.map((r) => {
    const sub = subByChurch.get(r.id);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: sub?.plan ?? null,
      status: sub?.status ?? null,
      isActive: r.isActive,
      overrides: overridesByChurch.get(r.id) ?? {},
    };
  });

  const flagDefs = FEATURE_FLAG_KEYS.map((k) => FEATURE_FLAGS[k]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin" />}
          className="h-8 gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to overview
        </Button>
      </div>

      <PageHeader
        title="Feature flags"
        description="Per-church rollout overrides. Toggling a cell writes an override that wins over the flag's registry default. Reset returns a church to the default."
      />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">How this works</CardTitle>
              <CardDescription className="space-y-1.5 pt-1 text-xs">
                <p>
                  Flags are defined in{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    src/lib/feature-flags/flags.ts
                  </code>
                  . Each flag has a default; this page stores per-church{" "}
                  <em>overrides</em> to that default.
                </p>
                <p>
                  Feature flags work <strong>alongside</strong> plan-gating.
                  A church sees a feature only if BOTH the flag is on AND
                  their plan allows it. Turning a flag on for a Standard
                  church that normally wouldn&rsquo;t see an Enterprise
                  feature has no effect — the plan gate still blocks.
                </p>
                <p>
                  Cache TTL is 30 seconds; overrides propagate everywhere
                  within that window.
                </p>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FeatureFlagMatrix
            churches={churchRows}
            flags={flagDefs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
