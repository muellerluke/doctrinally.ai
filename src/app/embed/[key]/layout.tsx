import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

/**
 * Minimal wrapper for the embeddable chat iframe. We intentionally don't
 * inherit the root app's layout chrome (sidebar, marketing header, etc.)
 * because this view ships inside an iframe floating over another site.
 *
 * The `frame-ancestors` CSP header is set on the GET response via the
 * page component; this layout just establishes a transparent shell.
 */
export default async function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading headers keeps this layout dynamic so the per-request CSP
  // emitted in page.tsx isn't cached across churches.
  await headers();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
