import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listSermons } from "@/lib/actions/sermons";
import { hasSermonWriter } from "@/lib/plans";
import { getSermonBudgetStatus } from "@/lib/usage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCents } from "@/lib/sermons/token-budget";

export const dynamic = "force-dynamic";

export default async function SermonsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");
  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) redirect("/onboarding");

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, active.membership.churchId),
  });

  const planHasFeature = hasSermonWriter(sub?.plan);
  if (!planHasFeature) {
    return <UpgradePrompt planName={sub?.plan ?? "standard"} />;
  }

  const [{ sermons }, budget] = await Promise.all([
    listSermons(),
    getSermonBudgetStatus(active.membership.churchId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Sermons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft sermons with the AI assistant. Publish when ready so your
            church's chat can cite them.
          </p>
        </div>
        <Button render={<Link href="/sermons/new" />}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          New sermon
        </Button>
      </div>

      {budget && budget.enabled && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          This period&apos;s sermon-AI spend:{" "}
          <span className="font-semibold text-foreground">
            {formatCents(budget.spentCents)}
          </span>{" "}
          of {formatCents(budget.budgetCents)}.
          {budget.exhausted && (
            <span className="ml-2 text-destructive">Budget reached.</span>
          )}
        </div>
      )}

      {sermons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-8 py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            Draft your first sermon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Chat with an assistant on the left; your sermon takes shape on the
            right. Your Enterprise plan includes {formatCents(budget?.budgetCents ?? 1000)}{" "}
            of AI budget per month.
          </p>
          <Button render={<Link href="/sermons/new" />} className="mt-5">
            Start a sermon
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last edited</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sermons.map((sermon) => (
                <tr key={sermon.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sermons/${sermon.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {sermon.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <SermonStatusBadge
                      status={sermon.status}
                      membersSearchable={sermon.membersSearchable}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(sermon.updatedAt, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      render={<Link href={`/sermons/${sermon.id}/edit`} />}
                      variant="ghost"
                      size="sm"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SermonStatusBadge({
  status,
  membersSearchable,
}: {
  status: string;
  membersSearchable: boolean;
}) {
  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>;
  }
  if (status === "queued" || status === "processing") {
    return (
      <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300">
        Processing
      </Badge>
    );
  }
  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  if (status === "indexed") {
    return membersSearchable ? (
      <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300">
        Indexed · Searchable
      </Badge>
    ) : (
      <Badge variant="secondary">Indexed · Hidden</Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function UpgradePrompt({ planName }: { planName: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <h1 className="mt-4 font-heading text-2xl font-semibold">
        Sermon writer is an Enterprise feature
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Your {planName} plan doesn&apos;t include the AI sermon writer. Upgrade
        to Enterprise to chat with an assistant while drafting sermons and
        publish them straight into your church&apos;s library.
      </p>
      <Button render={<Link href="/billing" />} className="mt-5">
        View plans
      </Button>
    </div>
  );
}
