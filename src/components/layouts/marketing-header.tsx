import Link from "next/link";

import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-8 w-8 rounded-lg dark:hidden" />
            <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="hidden h-8 w-8 rounded-lg dark:block" />
            <span className="font-heading text-xl tracking-tight">
              Doctrinally.AI
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />}>Get started</Button>
        </div>
      </div>
    </header>
  );
}
