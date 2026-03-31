"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  validateInvitationToken,
  acceptInvitation,
  signUp,
} from "@/lib/actions/auth";

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, status: sessionStatus } = useSession();

  const [inviteStatus, setInviteStatus] = useState<
    "loading" | "valid" | "invalid" | "accepted"
  >("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setInviteStatus("invalid");
      setErrorMessage("No invitation token provided");
      return;
    }

    validateInvitationToken(token).then((result) => {
      if (result.error) {
        setInviteStatus("invalid");
        setErrorMessage(result.error);
      } else if (result.invitation) {
        setInviteStatus("valid");
        setInviteEmail(result.invitation.email);
        setInviteRole(result.invitation.role);
      }
    });
  }, [token]);

  // Auto-accept if user is already signed in and email matches
  useEffect(() => {
    if (
      inviteStatus === "valid" &&
      session?.user?.id &&
      session?.user?.email === inviteEmail &&
      token
    ) {
      acceptInvitation(token, session.user.id).then((result) => {
        if (result.error) {
          toast.error(result.error);
        } else {
          setInviteStatus("accepted");
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 1500);
        }
      });
    }
  }, [inviteStatus, session, inviteEmail, token, router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
        return;
      }
      // Session will update, triggering the auto-accept useEffect
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signUp({ name, email: inviteEmail, password });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Auto sign in
      const signInResult = await signIn("credentials", {
        email: inviteEmail,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        toast.error("Account created. Please sign in.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (inviteStatus === "loading" || sessionStatus === "loading") {
    return (
      <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            Checking invitation...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (inviteStatus === "invalid") {
    return (
      <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="font-heading text-2xl">
            Invalid invitation
          </CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (inviteStatus === "accepted") {
    return (
      <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            You&apos;re in!
          </CardTitle>
          <CardDescription>
            Invitation accepted. Redirecting to dashboard...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Signed in but email doesn't match
  if (session?.user && session.user.email !== inviteEmail) {
    return (
      <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="font-heading text-2xl">
            Wrong account
          </CardTitle>
          <CardDescription>
            This invitation was sent to{" "}
            <span className="font-medium text-foreground">{inviteEmail}</span>,
            but you&apos;re signed in as{" "}
            <span className="font-medium text-foreground">
              {session.user.email}
            </span>
            . Please sign out and sign in with the correct account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Not signed in — show auth forms
  return (
    <Card className="mx-auto max-w-sm shadow-xl shadow-primary/[0.04]">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">
          You&apos;ve been invited
        </CardTitle>
        <CardDescription>
          Sign in or create an account to join as{" "}
          <span className="font-medium text-foreground">{inviteRole}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sign-in">
          <TabsList className="w-full">
            <TabsTrigger value="sign-in" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="sign-up" className="flex-1">
              Sign up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sign-in" className="mt-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-si-email">Email</Label>
                <Input
                  id="inv-si-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-si-password">Password</Label>
                <Input
                  id="inv-si-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign in & accept
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="sign-up" className="mt-4">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-su-name">Name</Label>
                <Input
                  id="inv-su-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-su-email">Email</Label>
                <Input
                  id="inv-su-email"
                  type="email"
                  value={inviteEmail}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-su-password">Password</Label>
                <Input
                  id="inv-su-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create account & accept
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
