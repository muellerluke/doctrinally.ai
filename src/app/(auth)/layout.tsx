import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="parchment-texture flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/[0.05] via-background to-gold/[0.04] p-4">
      <Link href="/" className="relative mb-8 flex items-center gap-2.5">
        <img src="/logo-transparent-bg.png" alt="Doctrinally.AI" className="h-10 w-10 rounded-xl shadow-md dark:hidden" />
        <img src="/logo-orange-bg.png" alt="Doctrinally.AI" className="hidden h-10 w-10 rounded-xl shadow-md dark:block" />
        <span className="font-heading text-2xl tracking-tight">
          Doctrinally.AI
        </span>
      </Link>
      <div className="relative w-full">{children}</div>
    </div>
  );
}
