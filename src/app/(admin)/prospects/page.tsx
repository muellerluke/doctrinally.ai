import { UserPlus, Lock } from "lucide-react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects, subscriptions } from "@/db/schema";
import { requireMembership } from "@/lib/auth-guards";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ProspectsTable,
  type ProspectRow,
} from "@/components/prospects/prospects-table";
import type { ProspectStatus } from "@/db/schema/prospects";

export const metadata = {
  title: "Prospects — Doctrinally.AI",
};

// Per-request only — depends on session + per-church data, and queries
// the `prospects` table which may not exist at build time on a fresh
// deploy where migrations run after the build.
export const dynamic = "force-dynamic";

/**
 * Prospect list view. A lead is captured any time a website visitor
 * shares contact info (email or phone, optionally name) through the
 * embedded chat widget — either via the AI's `captureProspect` tool
 * or any future inline form. Gated on Enterprise because the widget
 * itself is Enterprise-only — Standard churches see an upgrade card
 * instead of the table.
 */
export default async function ProspectsPage() {
  const { church } = await requireMembership();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });

  if (!sub || !(await isEmbeddedChatAvailable(church.id, sub.plan))) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Prospects"
          description="Visitors who shared contact info through your website chat so a pastor can follow up."
        />
        <Card className="border-dashed">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
              <Lock className="h-5 w-5 text-gold" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Prospects
                <Badge
                  variant="secondary"
                  className="ml-2 border border-gold/40 bg-gold/10 text-[10px] font-semibold uppercase tracking-wider text-gold"
                >
                  Enterprise
                </Badge>
              </CardTitle>
              <CardDescription>
                Capture visitor leads from your own website. The embedded
                chat widget reaches out first, asks a page-aware question,
                and invites visitors to share their email or phone so a
                pastor can follow up — even when nobody&apos;s at the
                keyboard.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/billing" />}>
              Upgrade to Enterprise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = await db
    .select({
      id: prospects.id,
      name: prospects.name,
      email: prospects.email,
      phone: prospects.phone,
      status: prospects.status,
      sourceType: prospects.sourceType,
      sourceUrl: prospects.sourceUrl,
      metadata: prospects.metadata,
      chatId: prospects.chatId,
      createdAt: prospects.createdAt,
    })
    .from(prospects)
    .where(eq(prospects.churchId, church.id))
    .orderBy(desc(prospects.createdAt))
    .limit(500);

  const data: ProspectRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status as ProspectStatus,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    sourcePageTitle: r.metadata?.sourcePageTitle ?? null,
    chatId: r.chatId,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prospects"
        description="Visitors who shared their name and email through your website chat."
      />
      {data.length > 0 ? (
        <ProspectsTable rows={data} />
      ) : (
        <EmptyState
          icon={UserPlus}
          title="No prospects yet"
          description="When website visitors share an email or phone number through your chat widget, they'll appear here so you can follow up. Set up the widget in Settings → Website Chat."
        />
      )}
    </div>
  );
}
