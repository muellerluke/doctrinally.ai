"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Mail, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpSchema } from "@/lib/validations/auth";
import { signUp } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpAside } from "@/components/auth/auth-asides";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("invite");
    if (!token) return;
    router.replace(`/invite?token=${token}`);
  }, [searchParams, router]);

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
        toast.error(result.error);
        return;
      }

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

      window.plausible?.("Sign Up");

      router.push("/onboarding");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      aside={<SignUpAside />}
      steps={[
        { label: "Create your account", description: "30 seconds" },
        { label: "Name your church", description: "Pick a URL" },
        { label: "Pick a plan", description: "14 days free" },
      ]}
      currentStep={0}
    >
      <div className="animate-fade-up stagger-1 space-y-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
            Start free · no card today
          </div>
          <h1 className="mt-1 font-heading text-3xl leading-tight sm:text-4xl">
            Your church&rsquo;s own AI,
            <span className="italic text-primary"> in minutes.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account to get started. Already have one?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Pastor John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="pl-9"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@church.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-9"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pl-9"
              />
            </div>
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
          <Button
            className="h-11 w-full font-semibold"
            type="submit"
            disabled={loading || !agreed}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create my account
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
