"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Sparkles, Menu } from "lucide-react";
import { useChat, type ChatMessage } from "@/lib/hooks/use-chat";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatShell } from "@/components/chat/chat-shell";

interface ChatInterfaceProps {
  churchId: string;
  churchName: string;
  churchLogoUrl?: string | null;
  welcomeMessage?: string;
  chatId?: string;
  initialMessages?: ChatMessage[];
  isAuthenticated?: boolean;
  isDemo?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What does the Bible say about forgiveness?",
  "How can I grow in my faith?",
  "What are the core beliefs of our church?",
  "Can you explain the Gospel simply?",
];

export function ChatInterface({
  churchId,
  churchName,
  churchLogoUrl,
  welcomeMessage,
  chatId: initialChatId,
  initialMessages,
  isAuthenticated,
  isDemo,
}: ChatInterfaceProps) {
  const router = useRouter();
  const { toggleSidebar } = useChatShell();
  const {
    messages,
    chatId,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
  } = useChat({
    churchId,
    churchName,
    initialChatId,
    initialMessages,
  });

  // Update the URL when a new chat is created so authenticated users can
  // bookmark or share the conversation. Skip for anonymous users — they
  // don't have chat history and the navigation causes a page reload.
  const prevChatIdRef = useRef(initialChatId);
  useEffect(() => {
    if (isAuthenticated && chatId && chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      router.replace(`/chat/${chatId}`, { scroll: false });
    }
  }, [chatId, router, isAuthenticated]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Mobile navbar — visible only on small screens */}
      <div className="flex items-center gap-3 border-b px-3 py-2.5 md:hidden">
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        {churchLogoUrl ? (
          <img
            src={churchLogoUrl}
            alt={churchName}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <>
            <img
              src="/logo-light-mode.png"
              alt="Doctrinally.AI"
              className="h-6 w-6 rounded dark:hidden"
            />
            <img
              src="/logo-dark-mode.png"
              alt="Doctrinally.AI"
              className="hidden h-6 w-6 rounded dark:block"
            />
          </>
        )}
        <span className="truncate text-sm font-semibold">{churchName}</span>
      </div>

      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-9 w-9 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-3xl sm:text-4xl">
              Ask a question
            </h1>
            <p className="mt-2 text-muted-foreground">
              {welcomeMessage ||
                `Get answers from the Bible and ${churchName}'s teachings`}
            </p>
          </div>

          <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Sparkles className="mb-1 h-3.5 w-3.5 text-primary/60" />
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ChatMessages messages={messages} isStreaming={isLoading} />
      )}

      {error && (
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
        placeholder={
          isDemo
            ? "Try: \"What does the Bible say about anxiety?\""
            : undefined
        }
      />
    </div>
  );
}
