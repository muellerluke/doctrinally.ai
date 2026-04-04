import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-secondary/30 py-10">
      <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-transparent-bg.png" alt="Doctrinally.AI" className="h-6 w-6 rounded-md dark:hidden" />
          <img src="/logo-orange-bg.png" alt="Doctrinally.AI" className="hidden h-6 w-6 rounded-md dark:block" />
          <span className="font-heading text-base text-foreground">
            Doctrinally.AI
          </span>
        </div>
        <div className="flex items-center gap-6">
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
        <p>
          &copy; {new Date().getFullYear()} Doctrinally.AI. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
