import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Backwards-compatible centered-card chrome for auth pages that don't need
 * the split-pane AuthShell (sign-in, forgot-password, reset-password,
 * invite). Matches the previous `(auth)/layout.tsx` visual exactly.
 */
export function CenteredAuth({ children }: { children: ReactNode }) {
  return (
    <div className="parchment-texture flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/[0.05] via-background to-gold/[0.04] p-4">
      <Link href="/" className="relative mb-8 flex items-center gap-2.5">
        <img
          src="/logo-light-mode.png"
          alt="Doctrinally.AI"
          className="h-10 w-10 dark:hidden"
        />
        <img
          src="/logo-dark-mode.png"
          alt="Doctrinally.AI"
          className="hidden h-10 w-10 dark:block"
        />
        <span className="font-heading text-2xl tracking-tight">
          Doctrinally.AI
        </span>
      </Link>
      <div className="relative w-full">{children}</div>
    </div>
  );
}
