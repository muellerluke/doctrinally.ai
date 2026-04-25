import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, and, inArray } from "drizzle-orm";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Globe,
  MessageSquare,
} from "lucide-react";
import { db } from "@/db";
import {
  chats,
  messages,
  prospects,
  embedWidgetSessions,
  subscriptions,
} from "@/db/schema";
import { requireMembership } from "@/lib/auth-guards";
import { isEmbeddedChatAvailable } from "@/lib/plan-gating";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/prospects/status-select";
import type { ProspectStatus } from "@/db/schema/prospects";

export const metadata = {
  title: "Prospect — Doctrinally.AI",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { church } = await requireMembership();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });
  if (!sub || !(await isEmbeddedChatAvailable(church.id, sub.plan))) {
    notFound();
  }

  const prospect = await db.query.prospects.findFirst({
    where: and(
      eq(prospects.id, id),
      eq(prospects.churchId, church.id)
    ),
  });
  if (!prospect) notFound();

  // Collect every chat this prospect has had with the widget. The
  // canonical link is `prospect.chat_id`; merge-on-return appends
  // more sessions into `metadata.sessionHistory`, so also look up
  // their chats.
  const sessionIds = prospect.metadata?.sessionHistory ?? [];
  const extraSessions = sessionIds.length
    ? await db
        .select({
          id: embedWidgetSessions.id,
          chatId: embedWidgetSessions.chatId,
          origin: embedWidgetSessions.origin,
          createdAt: embedWidgetSessions.createdAt,
          lastPageUrl: embedWidgetSessions.metadata,
        })
        .from(embedWidgetSessions)
        .where(
          and(
            eq(embedWidgetSessions.churchId, church.id),
            inArray(embedWidgetSessions.id, sessionIds)
          )
        )
    : [];

  const chatIds = new Set<string>();
  if (prospect.chatId) chatIds.add(prospect.chatId);
  for (const s of extraSessions) chatIds.add(s.chatId);

  const chatList = chatIds.size
    ? await db
        .select({
          id: chats.id,
          title: chats.title,
          createdAt: chats.createdAt,
          updatedAt: chats.updatedAt,
        })
        .from(chats)
        .where(
          and(
            eq(chats.churchId, church.id),
            inArray(chats.id, [...chatIds])
          )
        )
    : [];

  const transcript = chatList.length
    ? await db
        .select()
        .from(messages)
        .where(inArray(messages.chatId, chatList.map((c) => c.id)))
        .orderBy(asc(messages.createdAt))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/prospects" />}
          className="h-8 gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All prospects
        </Button>
      </div>

      <PageHeader
        title={prospect.name}
        description={prospect.email}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Conversation</CardTitle>
            <span className="text-xs text-muted-foreground">
              {transcript.length}{" "}
              {transcript.length === 1 ? "message" : "messages"}
            </span>
          </CardHeader>
          <CardContent>
            {transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No conversation recorded for this prospect yet.
              </p>
            ) : (
              <div className="space-y-3">
                {transcript.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "user"
                        ? "ml-8 rounded-lg border bg-muted/30 p-3"
                        : "mr-8 rounded-lg border border-primary/20 bg-primary/5 p-3"
                    }
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>
                        {m.role === "user" ? "Visitor" : "Website chat"}
                      </span>
                      <span>
                        {new Date(m.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusSelect
                prospectId={prospect.id}
                initial={prospect.status as ProspectStatus}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${prospect.email}`}
                  className="truncate text-foreground hover:underline"
                >
                  {prospect.email}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Captured{" "}
                  {new Date(prospect.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {prospect.sourceUrl && (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={prospect.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-muted-foreground hover:text-foreground hover:underline"
                    title={prospect.sourceUrl}
                  >
                    {prospect.sourceUrl}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {chatList.length}{" "}
                  {chatList.length === 1 ? "session" : "sessions"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
