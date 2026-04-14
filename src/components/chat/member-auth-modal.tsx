"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signUp } from "@/lib/actions/auth";

interface MemberAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberAuthModal({ open, onOpenChange }: MemberAuthModalProps) {
  const router = useRouter();

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Sign up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpAgreed, setSignUpAgreed] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInLoading(true);
    try {
      const result = await signIn("credentials", {
        email: signInEmail,
        password: signInPassword,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!signUpAgreed) {
      toast.error("Please agree to the Terms of Use and Privacy Policy");
      return;
    }
    setSignUpLoading(true);
    try {
      const result = await signUp({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email: signUpEmail,
        password: signUpPassword,
        redirect: false,
      });
      if (signInResult?.error) {
        toast.error("Account created. Please sign in.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSignUpLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Welcome</DialogTitle>
        </DialogHeader>
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
                <Label htmlFor="si-email">Email</Label>
                <Input
                  id="si-email"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-password">Password</Label>
                <Input
                  id="si-password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={signInLoading}>
                {signInLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="sign-up" className="mt-4">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">Name</Label>
                <Input
                  id="su-name"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <Input
                  id="su-password"
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="su-agree"
                  checked={signUpAgreed}
                  onCheckedChange={(v) => setSignUpAgreed(v === true)}
                  disabled={signUpLoading}
                  className="mt-0.5"
                />
                <label
                  htmlFor="su-agree"
                  className="text-[11px] leading-relaxed text-muted-foreground"
                >
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              <Button className="w-full" type="submit" disabled={signUpLoading || !signUpAgreed}>
                {signUpLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
