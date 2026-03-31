"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, LogIn, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MemberAuthModal } from "@/components/chat/member-auth-modal";

interface ChatSidebarProps {
  churchName: string;
  churchLogoUrl?: string | null;
}

export function ChatSidebar({ churchName, churchLogoUrl }: ChatSidebarProps) {
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-card">
        {/* Church header */}
        <div className="flex items-center gap-2.5 border-b p-4">
          {churchLogoUrl ? (
            <img
              src={churchLogoUrl}
              alt={churchName}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
          <span className="font-heading text-sm font-semibold leading-tight">
            {churchName}
          </span>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <Button variant="outline" className="w-full justify-start gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        {/* Chat history placeholder */}
        <div className="flex-1 overflow-y-auto px-3">
          <p className="py-8 text-center text-xs text-muted-foreground">
            {session
              ? "Your conversations will appear here"
              : "Sign in to save your chat history"}
          </p>
        </div>

        <Separator />

        {/* Auth / user section */}
        <div className="p-3">
          {session ? (
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {session.user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="truncate">{session.user?.name || session.user?.email}</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              size="sm"
              onClick={() => setAuthOpen(true)}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>
      </aside>

      <MemberAuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
