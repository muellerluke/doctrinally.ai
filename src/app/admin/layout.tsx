import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { SignOutButton } from "./sign-out-button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
  if (!session) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img
              src="/logo-dark-mode.png"
              alt="Doctrinally.AI"
              className="h-7 w-7 rounded-lg"
            />
            <span className="font-heading text-lg text-foreground">
              Super Admin
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
