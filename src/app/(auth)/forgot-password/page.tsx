import Link from "next/link";
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

export default function ForgotPasswordPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@church.com" />
          </div>
          <Button className="w-full" type="submit">
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
