"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Code2,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CenteredAuth } from "@/components/auth/centered-auth";
import { verifyCheckoutSession } from "@/lib/actions/billing";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [embedPublicKey, setEmbedPublicKey] = useState<string | null>(null);
  const [embedScriptUrl, setEmbedScriptUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Missing checkout session");
      return;
    }

    verifyCheckoutSession(sessionId).then((result) => {
      if ("error" in result && result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }
      if ("success" in result && result.success) {
        setEmbedPublicKey(result.embedPublicKey);
        setEmbedScriptUrl(result.embedScriptUrl);
        setStatus("success");
        // Defensive fallback: if the key is somehow missing, the user
        // isn't stranded — push them to settings where they can generate
        // one and grab the snippet.
        if (!result.embedPublicKey || !result.embedScriptUrl) {
          setTimeout(() => {
            router.push("/settings");
            router.refresh();
          }, 2000);
        }
      }
    });
  }, [sessionId, router]);

  const scriptSnippet =
    embedPublicKey && embedScriptUrl
      ? `<script src="${embedScriptUrl}" data-church-key="${embedPublicKey}" async></script>`
      : "";

  async function handleCopy() {
    if (!scriptSnippet) return;
    try {
      await navigator.clipboard.writeText(scriptSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  if (status === "loading") {
    return (
      <CenteredAuth>
        <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Setting up your church...
            </CardTitle>
            <CardDescription>
              Confirming your payment and activating your account
            </CardDescription>
          </CardHeader>
        </Card>
      </CenteredAuth>
    );
  }

  if (status === "error") {
    return (
      <CenteredAuth>
        <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Something went wrong
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button className="w-full">Try again</Button>
            </Link>
          </CardContent>
        </Card>
      </CenteredAuth>
    );
  }

  // Defensive fallback view while the redirect kicks in.
  if (!scriptSnippet) {
    return (
      <CenteredAuth>
        <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-heading text-2xl">
              You&apos;re all set!
            </CardTitle>
            <CardDescription>
              Taking you to your settings...
            </CardDescription>
          </CardHeader>
        </Card>
      </CenteredAuth>
    );
  }

  return (
    <CenteredAuth>
      <Card className="mx-auto max-w-xl shadow-xl shadow-primary/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            You&apos;re all set!
          </CardTitle>
          <CardDescription>
            Your church is live. One last step — paste this script onto your
            website to turn on Website Chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Code2 className="h-4 w-4 text-primary" />
                Your embed script
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!scriptSnippet}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
              <code>{scriptSnippet}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              Place this just before the closing{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                &lt;/body&gt;
              </code>{" "}
              tag on every page where you want the chat to appear — or drop it
              into a global template (Squarespace code injection, WordPress
              footer, Webflow custom code, etc).
            </p>
          </div>

          <div className="rounded-md border border-amber-200/60 bg-amber-50/60 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="text-amber-900 dark:text-amber-100">
                The script won&rsquo;t do anything on your site until your trial
                is active — which it now is. You can pause or rotate the key
                anytime from settings.
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              className="h-11 w-full font-semibold"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Continue to Dashboard
            </Button>
            <Link
              href="/settings"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              I&rsquo;ll install it later — take me to settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </CenteredAuth>
  );
}
