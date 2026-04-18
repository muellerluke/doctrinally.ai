import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { hasSermonWriter } from "@/lib/plans";
import { getSermonSession } from "@/lib/actions/sermons";
import { getSermonBudgetStatus } from "@/lib/usage";
import { SermonWorkspace } from "@/components/sermons/sermon-workspace";
import type { SermonChatUiMessage } from "@/components/sermons/sermon-chat-panel";
import type { SermonMessageFence } from "@/components/sermons/sermon-chat-message";
import { findClosedEditFences } from "@/lib/sermons/diff-parser";
import type { Citation } from "@/lib/types/citations";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SermonEditPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) redirect("/onboarding");

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, active.membership.churchId),
  });
  if (!hasSermonWriter(sub?.plan)) {
    redirect("/sermons");
  }

  const result = await getSermonSession(id);
  if ("error" in result) {
    notFound();
  }
  const { document, session: sermonSession } = result;

  if (document.churchId !== active.membership.churchId) notFound();

  const budget = await getSermonBudgetStatus(active.membership.churchId);

  // Hydrate chat history, computing fence metadata so previously-applied
  // diffs render as collapsed diff cards instead of replaying edits.
  const initialMessages: SermonChatUiMessage[] = (sermonSession?.messages ?? []).map(
    (msg) => {
      const fences: Record<number, SermonMessageFence> = {};
      if (msg.role === "assistant") {
        const parsed = findClosedEditFences(msg.content);
        for (const f of parsed.fences) {
          fences[f.start] = {
            start: f.start,
            closed: true,
            diff: f.parsed,
          };
        }
      }
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        citations: msg.citations as Citation[] | undefined,
        fences,
      };
    }
  );

  return (
    <SermonWorkspace
      documentId={document.id}
      initialTitle={document.title}
      initialContent={document.content ?? ""}
      initialMessages={initialMessages}
      budget={{
        enabled: budget?.enabled ?? false,
        budgetCents: budget?.budgetCents ?? 0,
        spentCents: budget?.spentCents ?? 0,
      }}
    />
  );
}
