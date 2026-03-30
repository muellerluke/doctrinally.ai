import { BookOpen } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t py-10">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-3 w-3" />
          </div>
          <span className="font-medium text-foreground">Doctrinally.AI</span>
        </div>
        <p>
          &copy; {new Date().getFullYear()} Doctrinally.AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
