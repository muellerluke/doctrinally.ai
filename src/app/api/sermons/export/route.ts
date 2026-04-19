import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, memberships } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { plateToSermonMarkdown } from "@/lib/sermons/markdown-serializer";
import { lookupByReference } from "@/lib/bible";
import { isSuperAdminEmail } from "@/lib/super-admin";

/**
 * Export a sermon as plain markdown. The response is `text/markdown` with a
 * `Content-Disposition` hint so the browser offers a download.
 *
 * `?includeVerses=1` expands `<bible-passage>` references into inline verse
 * text for offline use; without it the tag is left as a self-closing stub
 * the user can paste back into the editor.
 *
 * PDF and DOCX exports will be added via a Trigger.dev job in a follow-up;
 * markdown covers the most common export need today.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");
  const includeVerses = url.searchParams.get("includeVerses") === "1";
  if (!documentId) return new Response("documentId is required", { status: 400 });

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.type, "sermon")),
  });
  if (!doc) return new Response("Not found", { status: 404 });

  // Super-admin bypasses the per-church membership check for support/debugging.
  if (!isSuperAdminEmail(session.user.email)) {
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, session.user.id),
        eq(memberships.churchId, doc.churchId)
      ),
    });
    if (!membership || membership.role === "member") {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let plateNodes: unknown[] = [];
  try {
    const parsed = JSON.parse(doc.content ?? "[]");
    if (Array.isArray(parsed)) plateNodes = parsed;
  } catch {
    plateNodes = [];
  }

  let markdown = plateToSermonMarkdown(plateNodes as never);

  if (includeVerses) {
    markdown = await hydrateVerses(markdown);
  }

  const filename = `${slugify(doc.title || "sermon")}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function hydrateVerses(markdown: string): Promise<string> {
  const regex = /<bible-passage\s+ref="([^"]*)"[^>]*\/>/g;
  const matches: { match: string; ref: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) {
    matches.push({ match: m[0], ref: m[1], index: m.index });
  }

  const hydrations = await Promise.all(
    matches.map(async ({ ref }) => {
      if (!ref) return "";
      const result = await lookupByReference(ref);
      if (!result) return "";
      return `> **${result.reference}** — ${result.text}`;
    })
  );

  // Replace in reverse order so indices stay valid
  let out = markdown;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match, index } = matches[i];
    const replacement = hydrations[i] || match;
    out = out.slice(0, index) + replacement + out.slice(index + match.length);
  }
  return out;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "sermon";
}
