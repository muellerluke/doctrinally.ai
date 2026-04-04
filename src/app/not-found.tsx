import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="parchment-texture flex min-h-screen flex-col items-center justify-center gap-5">
      <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-16 w-16 rounded-2xl dark:hidden" />
      <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="hidden h-16 w-16 rounded-2xl dark:block" />
      <h1 className="font-heading text-5xl">404</h1>
      <p className="text-muted-foreground">
        This page could not be found.
      </p>
      <Button render={<Link href="/" />}>Go home</Button>
    </div>
  );
}
