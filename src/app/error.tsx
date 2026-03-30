"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <div className="parchment-texture flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl shadow-destructive/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="font-heading text-2xl">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
