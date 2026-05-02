import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-secondary/30 py-10">
      <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-6 w-6 rounded-md dark:hidden" />
          <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="hidden h-6 w-6 rounded-md dark:block" />
          <span className="font-heading text-base text-foreground">
            Doctrinally.AI
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/blog"
            className="transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-foreground"
          >
            Terms of Use
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="flex items-center gap-4 text-xs">
            <a href="mailto:hello@doctrinally.ai" className="transition-colors hover:text-foreground">
              hello@doctrinally.ai
            </a>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Doctrinally.AI
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Owned and operated by L&amp;D Holdings LLC
          </p>
        </div>
      </div>
    </footer>
  );
}
