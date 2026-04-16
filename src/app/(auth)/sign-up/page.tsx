"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpSchema } from "@/lib/validations/auth";
import {
  signUp,
  validateInvitationToken,
  acceptInvitationForCurrentUser,
} from "@/lib/actions/auth";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("invite");
    if (!token) return;
    let cancelled = false;
    (async () => {
      const result = await validateInvitationToken(token);
      if (cancelled) return;
      if (result.error || !result.invitation) {
        toast.error(result.error || "Invalid invitation");
        return;
      }
      setEmail(result.invitation.email);
      setInviteToken(token);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!agreed) {
      setErrors({ agreed: "You must agree to the terms to continue" });
      return;
    }

    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({ name, email, password });

      if (result.error) {
        if (inviteToken) {
          router.replace(`/invite?token=${inviteToken}`);
          return;
        }
        toast.error(result.error);
        return;
      }

      // Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Account created but sign-in failed. Please sign in manually.");
        router.push("/sign-in");
        return;
      }

      window.plausible?.("Sign Up", { props: { via_invite: !!inviteToken } });

      if (inviteToken) {
        const accept = await acceptInvitationForCurrentUser(inviteToken);
        if (accept.error) {
          toast.error(accept.error);
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-sm animate-fade-up stagger-1 shadow-xl shadow-primary/[0.04]">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">
          Create an account
        </CardTitle>
        <CardDescription>
          Get started with Doctrinally.AI for your church
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@church.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !!inviteToken}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => {
                  setAgreed(v === true);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.agreed;
                    return next;
                  });
                }}
                disabled={loading}
                className="mt-0.5"
              />
              <label
                htmlFor="agree-terms"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agreed && (
              <p className="text-sm text-destructive">{errors.agreed}</p>
            )}
          </div>
          <Button className="w-full" type="submit" disabled={loading || !agreed}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
