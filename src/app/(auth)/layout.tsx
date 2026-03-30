import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="parchment-texture flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/[0.05] via-background to-gold/[0.04] p-4">
      <Link href="/" className="relative mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <BookOpen className="h-5 w-5" />
        </div>
        <span className="font-heading text-2xl tracking-tight">
          Doctrinally.AI
        </span>
      </Link>
      <div className="relative w-full">{children}</div>
    </div>
  );
}
