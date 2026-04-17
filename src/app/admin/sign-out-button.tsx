"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      className="gap-1.5 text-muted-foreground"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </Button>
  );
}
