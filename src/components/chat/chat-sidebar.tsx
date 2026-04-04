"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  LogIn,
  Plus,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useChatShell } from "@/components/chat/chat-shell";
import { Separator } from "@/components/ui/separator";
import { MemberAuthModal } from "@/components/chat/member-auth-modal";
import { deleteChat } from "@/lib/actions/chats";

export interface ChatHistoryItem {
  id: string;
  title: string | null;
  updatedAt: Date;
}

interface ChatSidebarProps {
  churchName: string;
  churchLogoUrl?: string | null;
  chats?: ChatHistoryItem[];
}

function groupChatsByDate(chats: ChatHistoryItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; chats: ChatHistoryItem[] }[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Previous 7 days", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if (d >= today) {
      groups[0].chats.push(chat);
    } else if (d >= yesterday) {
      groups[1].chats.push(chat);
    } else if (d >= weekAgo) {
      groups[2].chats.push(chat);
    } else {
      groups[3].chats.push(chat);
    }
  }

  return groups.filter((g) => g.chats.length > 0);
}

export function ChatSidebar({
  churchName,
  churchLogoUrl,
  chats: chatHistory = [],
}: ChatSidebarProps) {
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { sidebarOpen, closeSidebar } = useChatShell();

  // Extract current chatId from URL
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  const groups = groupChatsByDate(chatHistory);

  function handleDeleteChat(e: React.MouseEvent, chatId: string) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteChat(chatId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        // If we deleted the current chat, navigate to new chat
        if (currentChatId === chatId) {
          router.push("/chat");
        }
        router.refresh();
      }
    });
  }

  function handleNavigate(path: string) {
    router.push(path);
    closeSidebar();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Church header */}
        <div className="flex items-center gap-2.5 border-b p-4">
          {churchLogoUrl ? (
            <img
              src={churchLogoUrl}
              alt={churchName}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <>
              <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-8 w-8 rounded-lg dark:hidden" />
              <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="hidden h-8 w-8 rounded-lg dark:block" />
            </>
          )}
          <span className="font-heading text-sm font-semibold leading-tight">
            {churchName}
          </span>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => router.push("/chat")}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-2">
          {!session ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Sign in to save your chat history
            </p>
          ) : chatHistory.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Your conversations will appear here
            </p>
          ) : (
            <div className="space-y-4 pb-2">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.chats.map((chat) => (
                      <div
                        key={chat.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/chat/${chat.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            router.push(`/chat/${chat.id}`);
                        }}
                        className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                          currentChatId === chat.id
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        <span className="min-w-0 flex-1 truncate">
                          {chat.title || "Untitled"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-destructive"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Auth / user section */}
        <div className="p-3">
          {session ? (
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {session.user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="truncate">
                {session.user?.name || session.user?.email}
              </span>
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
