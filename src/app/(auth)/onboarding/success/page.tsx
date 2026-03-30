"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyCheckoutSession } from "@/lib/actions/billing";
import Link from "next/link";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Missing checkout session");
      return;
    }

    verifyCheckoutSession(sessionId).then((result) => {
      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
      } else {
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      }
    });
  }, [sessionId, router]);

  return (
    <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
      <CardHeader className="text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Setting up your church...
            </CardTitle>
            <CardDescription>
              Confirming your payment and activating your account
            </CardDescription>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-heading text-2xl">
              You&apos;re all set!
            </CardTitle>
            <CardDescription>
              Your church is ready. Redirecting to your dashboard...
            </CardDescription>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Something went wrong
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </>
        )}
      </CardHeader>
      {status === "error" && (
        <CardContent>
          <Link href="/onboarding">
            <Button className="w-full">Try again</Button>
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
