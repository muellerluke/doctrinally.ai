import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="parchment-texture flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <BookOpen className="h-7 w-7 text-primary" />
      </div>
      <h1 className="font-heading text-5xl">404</h1>
      <p className="text-muted-foreground">
        This page could not be found.
      </p>
      <Button render={<Link href="/" />}>Go home</Button>
    </div>
  );
}
