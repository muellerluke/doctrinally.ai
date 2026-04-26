import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, and, inArray } from "drizzle-orm";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Globe,
  MessageSquare,
  Eye,
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

function formatPagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.host : u.pathname;
  } catch {
    return url.slice(0, 80);
  }
}

export const metadata = {
  title: "Prospect — Doctrinally.AI",
};

// Per-request only — same rationale as /prospects/page.tsx. The dynamic
// `[id]` segment makes this implicitly dynamic in most cases, but
// declaring it explicitly is safer than relying on inference.
export const dynamic = "force-dynamic";

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
          metadata: embedWidgetSessions.metadata,
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

  // Map chatId → the session that produced it, so we can label each
  // turn in the transcript with the page the visitor was on. The
  // session metadata is the freshest "what they were looking at"
  // signal we have for chat-only prospects (sourceUrl is fixed at
  // first capture).
  const sessionByChatId = new Map<
    string,
    { id: string; createdAt: Date; pageUrl: string | null; pageTitle: string | null }
  >();
  for (const s of extraSessions) {
    sessionByChatId.set(s.chatId, {
      id: s.id,
      createdAt: s.createdAt,
      pageUrl: s.metadata?.lastPageUrl ?? null,
      pageTitle: s.metadata?.lastPageTitle ?? null,
    });
  }

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

  // Group transcript by chat so the UI can show a "Viewing: <page>"
  // header above each conversation. Multi-session prospects can have
  // chatted from several pages and a flat list hides that context.
  const sortedChats = [...chatList].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const transcriptByChat = sortedChats.map((c) => {
    const session = sessionByChatId.get(c.id);
    return {
      chatId: c.id,
      chatCreatedAt: c.createdAt,
      pageUrl: session?.pageUrl ?? null,
      pageTitle: session?.pageTitle ?? null,
      messages: transcript.filter((m) => m.chatId === c.id),
    };
  });

  const sourcePageTitle = prospect.metadata?.sourcePageTitle ?? null;
  const sourcePagePath = formatPagePath(prospect.sourceUrl);

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
        title={prospect.name ?? "Unnamed prospect"}
        description={
          prospect.email || prospect.phone || "No contact info yet"
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Conversation</CardTitle>
              {(sourcePageTitle || sourcePagePath) && (
                <p
                  className="mt-1 text-xs text-muted-foreground"
                  title={prospect.sourceUrl ?? undefined}
                >
                  Captured while viewing{" "}
                  <span className="font-medium text-foreground/80">
                    {sourcePageTitle ?? sourcePagePath}
                  </span>
                  {sourcePageTitle && sourcePagePath && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({sourcePagePath})
                    </span>
                  )}
                </p>
              )}
            </div>
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
              <div className="space-y-6">
                {transcriptByChat.map((c, idx) => {
                  const chatPath = formatPagePath(c.pageUrl);
                  const showSessionHeader =
                    transcriptByChat.length > 1 ||
                    !!(c.pageTitle || chatPath);
                  return (
                    <div key={c.chatId} className="space-y-3">
                      {showSessionHeader && (
                        <div className="flex items-baseline justify-between border-b pb-2">
                          <div
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                            title={c.pageUrl ?? undefined}
                          >
                            <Eye className="h-3 w-3 shrink-0" />
                            {transcriptByChat.length > 1 && (
                              <span className="font-medium text-foreground/70">
                                Session {idx + 1} —
                              </span>
                            )}
                            {c.pageTitle || chatPath ? (
                              <span>
                                viewing{" "}
                                <span className="text-foreground/80">
                                  {c.pageTitle ?? chatPath}
                                </span>
                                {c.pageTitle && chatPath && (
                                  <span className="text-muted-foreground/80">
                                    {" "}
                                    ({chatPath})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>page unknown</span>
                            )}
                          </div>
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {new Date(c.chatCreatedAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      )}
                      <div className="space-y-3">
                        {c.messages.map((m) => (
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
                                {m.role === "user"
                                  ? "Visitor"
                                  : "Website chat"}
                              </span>
                              <span>
                                {new Date(m.createdAt).toLocaleString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                              {m.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
              {prospect.email && (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`mailto:${prospect.email}`}
                    className="truncate text-foreground hover:underline"
                  >
                    {prospect.email}
                  </a>
                </div>
              )}
              {prospect.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`tel:${prospect.phone.replace(/[^+\d]/g, "")}`}
                    className="truncate text-foreground hover:underline"
                  >
                    {prospect.phone}
                  </a>
                </div>
              )}
              {!prospect.email && !prospect.phone && (
                <p className="text-xs italic text-muted-foreground">
                  No contact info on file yet.
                </p>
              )}
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
              {(sourcePageTitle || prospect.sourceUrl) && (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    {sourcePageTitle && (
                      <div className="truncate text-foreground/80">
                        {sourcePageTitle}
                      </div>
                    )}
                    {prospect.sourceUrl && (
                      <a
                        href={prospect.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                        title={prospect.sourceUrl}
                      >
                        {prospect.sourceUrl}
                      </a>
                    )}
                  </div>
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
